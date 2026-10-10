#!/usr/bin/env python3
"""
Script ETL Eurocontrol → Nhost PostgreSQL
Télécharge les fichiers Excel Eurocontrol et insère les données
journalières par ACC dans la table `daily_acc_data` hébergée sur Nhost.

Ce script fonctionne en parallèle du script principal `fetch_data.py`
qui continue à générer le JSON pour le dashboard.

Protection anti-corruption :
  - UPSERT avec protection sur les colonnes critiques (flights, delay_total,
    flights_prev_year, delay_total_prev_year). Une valeur existante n'est
    JAMAIS écrasée par un 0 provenant d'un fichier source corrompu.
"""

import io
import os
import sys
from datetime import datetime
from pathlib import Path

import pandas as pd
import requests
import psycopg2
from psycopg2.extras import execute_values

# ─────────────────────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────────────────────
URL_TRAFFIC = "https://www.eurocontrol.int/Economics/Download/ACCs.xlsx"
URL_DELAYS  = "https://www.eurocontrol.int/Economics/Download/ACC_ATFM_Delay.xlsx"

# La chaîne de connexion est lue depuis les variables d'environnement
NHOST_DB_URL = os.environ.get("NHOST_DB_URL")


# ─────────────────────────────────────────────────────────────
# TÉLÉCHARGEMENT
# ─────────────────────────────────────────────────────────────
def fetch_file(url: str) -> io.BytesIO:
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
    print(f"   📥 Téléchargement : {url}")
    session = requests.Session()
    adapter = requests.adapters.HTTPAdapter(max_retries=5)
    session.mount("https://", adapter)
    session.mount("http://", adapter)
    resp = session.get(url, headers=headers, timeout=120)
    resp.raise_for_status()
    return io.BytesIO(resp.content)


# ─────────────────────────────────────────────────────────────
# PARSING TRAFIC
# ─────────────────────────────────────────────────────────────
def parse_traffic(excel_bytes: io.BytesIO) -> pd.DataFrame:
    xl = pd.ExcelFile(excel_bytes)
    sheet = "Data" if "Data" in xl.sheet_names else xl.sheet_names[0]
    df = pd.read_excel(xl, sheet_name=sheet)
    df.columns = df.columns.astype(str).str.strip()

    date_col = "Day" if "Day" in df.columns else df.columns[3]
    df["Day"] = pd.to_datetime(df[date_col]).dt.normalize()
    df["DayOfWeek"] = df["Day"].dt.dayofweek

    if "Week" in df.columns:
        df["Week"] = pd.to_numeric(df["Week"], errors="coerce").fillna(0).astype(int)
    else:
        df["Week"] = df["Day"].dt.isocalendar().week.astype(int)

    df["Year"] = df["Day"].dt.year
    ent_col = "Entity" if "Entity" in df.columns else df.columns[0]
    df["Entity"] = df[ent_col].astype(str).str.strip().str.upper()
    fl_col = "Flights" if "Flights" in df.columns else df.columns[4]
    df["Flights"] = pd.to_numeric(df[fl_col], errors="coerce").fillna(0)

    py_col = "Flights Previous Year" if "Flights Previous Year" in df.columns else None
    df["Flights Previous Year"] = (
        pd.to_numeric(df[py_col], errors="coerce").fillna(0) if py_col else 0
    )

    return df[["Entity", "Day", "Week", "DayOfWeek", "Year", "Flights", "Flights Previous Year"]]


# ─────────────────────────────────────────────────────────────
# PARSING DÉLAIS
# ─────────────────────────────────────────────────────────────
def parse_delays(excel_bytes: io.BytesIO) -> pd.DataFrame:
    xl = pd.ExcelFile(excel_bytes)
    sheet = "Data" if "Data" in xl.sheet_names else xl.sheet_names[-1]
    df = pd.read_excel(xl, sheet_name=sheet)
    df.columns = df.columns.astype(str).str.strip()

    ent_col = "Entity" if "Entity" in df.columns else df.columns[0]
    df["Entity"] = df[ent_col].astype(str).str.strip().str.upper()

    before = len(df)
    df = df[~df["Entity"].str.contains("TOTAL NETWORK MANAGER AREA", na=False)]
    print(f"      🗑️  {before - len(df)} lignes d'agrégats réseau filtrées")

    date_col = "Day" if "Day" in df.columns else None
    if not date_col:
        for c in df.columns:
            if "date" in c.lower() or "day" in c.lower():
                date_col = c
                break
    if not date_col:
        raise ValueError("Colonne de date introuvable")

    df["Day"] = pd.to_datetime(df[date_col]).dt.normalize()

    col_map = {
        "capacityStaffing": "Delay_Capacity/Staffing (ATC)",
        "disruption":       "Delay_Disruptions (ATC)",
        "weather":          "Delay_Weather",
        "other":            "Delay_Other",
    }

    for key, col_name in col_map.items():
        if col_name in df.columns:
            df[key] = pd.to_numeric(df[col_name], errors="coerce").fillna(0)
        else:
            found = False
            for col in df.columns:
                if key.lower() in col.lower() or col_name.lower() in col.lower():
                    df[key] = pd.to_numeric(df[col], errors="coerce").fillna(0)
                    found = True
                    break
            if not found:
                df[key] = 0.0

    df["totalDelay"] = df["capacityStaffing"] + df["weather"] + df["other"] + df["disruption"]

    prev_col = "En-route ATFM delay (prev year)"
    if prev_col in df.columns:
        df["totalDelayPrev"] = pd.to_numeric(df[prev_col], errors="coerce").fillna(0)
    else:
        df["totalDelayPrev"] = 0.0

    return df[["Entity", "Day", "capacityStaffing", "weather", "other",
               "disruption", "totalDelay", "totalDelayPrev"]]


# ─────────────────────────────────────────────────────────────
# PRÉPARATION DES DONNÉES POUR INSERTION
# ─────────────────────────────────────────────────────────────
def build_rows(traffic_df: pd.DataFrame, delays_df: pd.DataFrame) -> list[tuple]:
    """
    Fusionne trafic + délais et prépare la liste de tuples à insérer.
    """
    current_year = traffic_df["Year"].max()
    print(f"   📅 Année courante détectée : {current_year}")

    traffic_curr = traffic_df[traffic_df["Year"] == current_year].copy()
    traffic_curr = traffic_curr.drop_duplicates(subset=["Entity", "Day"])

    merged = traffic_curr.merge(delays_df, on=["Entity", "Day"], how="left")
    merged = merged.drop_duplicates(subset=["Entity", "Day"])

    for col in ["capacityStaffing", "weather", "other", "disruption",
                "totalDelay", "totalDelayPrev"]:
        merged[col] = merged[col].fillna(0)

    rows: list[tuple] = []
    for _, r in merged.iterrows():
        # acc_short : nom court sans " ACC"
        acc_short = r["Entity"].replace(" ACC", "").strip()

        rows.append((
            r["Day"].date(),           # date
            int(r["Year"]),            # year
            int(r["Week"]),            # week
            int(r["DayOfWeek"]),       # day_of_week
            r["Entity"],               # acc_code
            acc_short,                 # acc_short
            int(r["Flights"]),         # flights
            int(r["Flights Previous Year"]),  # flights_prev_year
            int(round(r["capacityStaffing"])),  # delay_capacity_staffing
            int(round(r["weather"])),           # delay_weather
            int(round(r["other"])),             # delay_other
            int(round(r["disruption"])),        # delay_disruption
            int(round(r["totalDelay"])),        # delay_total
            int(round(r["totalDelayPrev"])),    # delay_total_prev_year
        ))

    return rows


# ─────────────────────────────────────────────────────────────
# INSERTION DANS NHOST (avec protection anti-corruption)
# ─────────────────────────────────────────────────────────────
def upsert_to_nhost(rows: list[tuple]) -> None:
    """
    Insère les lignes dans la table daily_acc_data.

    Si (date, acc_code) existe déjà :
      - Les colonnes critiques (flights, delay_total, flights_prev_year,
        delay_total_prev_year) ne sont PAS écrasées par un 0. On conserve
        l'ancienne valeur si la nouvelle est 0 (protection contre un
        fichier source corrompu).
      - Les autres colonnes sont mises à jour normalement.
    """
    if not rows:
        print("   ⚠️  Aucune ligne à insérer.")
        return

    print(f"   🔌 Connexion à Nhost...")
    conn = psycopg2.connect(NHOST_DB_URL)
    try:
        with conn.cursor() as cur:
            sql = """
                INSERT INTO daily_acc_data (
                    date, year, week, day_of_week,
                    acc_code, acc_short,
                    flights, flights_prev_year,
                    delay_capacity_staffing, delay_weather,
                    delay_other, delay_disruption,
                    delay_total, delay_total_prev_year
                ) VALUES %s
                ON CONFLICT (date, acc_code) DO UPDATE SET
                    year = EXCLUDED.year,
                    week = EXCLUDED.week,
                    day_of_week = EXCLUDED.day_of_week,
                    acc_short = EXCLUDED.acc_short,

                    -- Colonnes critiques : jamais écraser une valeur par 0
                    flights = CASE
                        WHEN EXCLUDED.flights > 0 THEN EXCLUDED.flights
                        ELSE daily_acc_data.flights
                    END,
                    flights_prev_year = CASE
                        WHEN EXCLUDED.flights_prev_year > 0 THEN EXCLUDED.flights_prev_year
                        ELSE daily_acc_data.flights_prev_year
                    END,
                    delay_total = CASE
                        WHEN EXCLUDED.delay_total > 0 THEN EXCLUDED.delay_total
                        ELSE daily_acc_data.delay_total
                    END,
                    delay_total_prev_year = CASE
                        WHEN EXCLUDED.delay_total_prev_year > 0 THEN EXCLUDED.delay_total_prev_year
                        ELSE daily_acc_data.delay_total_prev_year
                    END,

                    -- Colonnes non critiques : mises à jour normalement
                    -- (un 0 est une valeur légitime pour ces causes)
                    delay_capacity_staffing = EXCLUDED.delay_capacity_staffing,
                    delay_weather = EXCLUDED.delay_weather,
                    delay_other = EXCLUDED.delay_other,
                    delay_disruption = EXCLUDED.delay_disruption,

                    updated_at = NOW()
            """
            execute_values(cur, sql, rows, page_size=500)
        conn.commit()
        print(f"   ✅ {len(rows)} lignes insérées / mises à jour dans Nhost.")
    except Exception as e:
        conn.rollback()
        print(f"   ❌ Erreur lors de l'insertion : {e}")
        raise
    finally:
        conn.close()


# ─────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────
def main():
    print("=" * 60)
    print("🚀 ETL Eurocontrol → Nhost (BDD historique)")
    print("=" * 60)

    if not NHOST_DB_URL:
        print("❌ Variable d'environnement NHOST_DB_URL manquante.")
        print("   Définissez-la avant de lancer le script.")
        sys.exit(1)

    print("\n📊 [1/4] Trafic (ACCs.xlsx)...")
    traffic_bytes = fetch_file(URL_TRAFFIC)
    traffic_df = parse_traffic(traffic_bytes)
    print(f"   ✅ {len(traffic_df):,} lignes de trafic analysées")

    print("\n⏱️  [2/4] Délais par ACC (ACC_ATFM_Delay.xlsx)...")
    delays_bytes = fetch_file(URL_DELAYS)
    delays_df = parse_delays(delays_bytes)
    print(f"   ✅ {len(delays_df):,} lignes de délais analysées")

    print("\n🔗 [3/4] Fusion trafic + délais...")
    rows = build_rows(traffic_df, delays_df)
    print(f"   ✅ {len(rows):,} lignes prêtes pour insertion")

    print("\n💾 [4/4] UPSERT dans Nhost (avec protection anti-corruption)...")
    upsert_to_nhost(rows)

    print(f"\n✅ Opération terminée à {datetime.now().isoformat()}")


if __name__ == "__main__":
    main()