#!/usr/bin/env python3
"""
Script ETL Eurocontrol → Nhost PostgreSQL
Télécharge les fichiers Excel Eurocontrol et alimente la table
`daily_acc_data` hébergée sur Nhost.

Fonctionnement en deux modes selon le contrôle d'intégrité sur les 5 ACC français :
  1. Mode nominal (aucun vol à 0 sur les 5 ACC français dans l'année en cours) :
     UPSERT complet de toute l'année (colonnes N et N-1 mises à jour librement,
     y compris les corrections d'Eurocontrol ramenant un délai à 0 min).
  2. Mode dégradé (au moins un vol à 0 détecté sur un ACC français, ex. bug week-end) :
     Pas de mise à jour globale de la BDD. Seule la journée J-1 (today - 1)
     est insérée (si valide), sans mise à jour des colonnes N-1 tant que le test
     global des vols à 0 n'est pas repassé au vert.

Note : les colonnes prev_year sont TEMPORAIRES. Elles seront supprimées
fin 2027 quand la BDD aura 2 années complètes et que la comparaison
N-1 pourra se faire par JOIN.
"""

import io
import os
import sys
from datetime import datetime, timedelta

import pandas as pd
import requests
import psycopg2
from psycopg2.extras import execute_values

# ─────────────────────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────────────────────
URL_TRAFFIC = "https://www.eurocontrol.int/Economics/Download/ACCs.xlsx"
URL_DELAYS  = "https://www.eurocontrol.int/Economics/Download/ACC_ATFM_Delay.xlsx"

NHOST_DB_URL = os.environ.get("NHOST_DB_URL")

FRENCH_ACCS = {
    "BREST ACC",
    "BORDEAUX ACC",
    "MARSEILLE ACC",
    "REIMS ACC",
    "PARIS ACC",
}


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

    iso = df["Day"].dt.isocalendar()
    df["Year"] = iso.year.astype(int)
    df["Week"] = iso.week.astype(int)
    df["CalYear"] = df["Day"].dt.year.astype(int)

    ent_col = "Entity" if "Entity" in df.columns else df.columns[0]
    df["Entity"] = df[ent_col].astype(str).str.strip().str.upper()
    fl_col = "Flights" if "Flights" in df.columns else df.columns[4]
    df["Flights"] = pd.to_numeric(df[fl_col], errors="coerce").fillna(0).astype(int)

    py_col = "Flights Previous Year" if "Flights Previous Year" in df.columns else None
    df["Flights Previous Year"] = (
        pd.to_numeric(df[py_col], errors="coerce").fillna(0).astype(int) if py_col else 0
    )

    return df[["Entity", "Day", "Week", "DayOfWeek", "Year", "CalYear",
               "Flights", "Flights Previous Year"]]


# ─────────────────────────────────────────────────────────────
# PARSING DÉLAIS (entiers en minutes)
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
            df[key] = pd.to_numeric(df[col_name], errors="coerce").fillna(0).astype(int)
        else:
            found = False
            for col in df.columns:
                if key.lower() in col.lower() or col_name.lower() in col.lower():
                    df[key] = pd.to_numeric(df[col], errors="coerce").fillna(0).astype(int)
                    found = True
                    break
            if not found:
                df[key] = 0

    df["totalDelay"] = df["capacityStaffing"] + df["weather"] + df["other"] + df["disruption"]

    prev_col = "En-route ATFM delay (prev year)"
    if prev_col in df.columns:
        df["totalDelayPrev"] = pd.to_numeric(df[prev_col], errors="coerce").fillna(0).astype(int)
    else:
        df["totalDelayPrev"] = 0

    return df[["Entity", "Day", "capacityStaffing", "weather", "other",
               "disruption", "totalDelay", "totalDelayPrev"]]


# ─────────────────────────────────────────────────────────────
# CONTRÔLE D'INTÉGRITÉ & PRÉPARATION DES LIGNES
# ─────────────────────────────────────────────────────────────
def has_french_zero_flights(df: pd.DataFrame) -> tuple[bool, str]:
    """
    Vérifie la présence des 5 ACC français et l'absence de journées à 0 vol.
    Retourne (is_corrupted, message_diagnostic).
    """
    present_french = set(df["Entity"].unique()) & FRENCH_ACCS
    missing_french = sorted(FRENCH_ACCS - present_french)
    if missing_french:
        return True, f"ACC français manquants : {', '.join(missing_french)}"

    french_df = df[df["Entity"].isin(FRENCH_ACCS)]
    zero_df = french_df[french_df["Flights"] <= 0]
    if not zero_df.empty:
        nb_rows = len(zero_df)
        min_day = zero_df["Day"].min().date()
        max_day = zero_df["Day"].max().date()
        accs = ", ".join(sorted(zero_df["Entity"].unique()))
        return True, f"{nb_rows} ligne(s) à 0 vol sur [{accs}] entre {min_day} et {max_day}"

    return False, "Aucun vol à 0 sur les 5 ACC français"


def build_rows(traffic_df: pd.DataFrame, delays_df: pd.DataFrame) -> tuple[list[tuple], bool]:
    """
    Fusionne trafic et délais, applique le contrôle d'intégrité sur les 5 ACC français
    et retourne `(rows, update_prev_year)` :
      - `update_prev_year = True`  → fichier sain, UPSERT complet de l'année (N + N-1)
      - `update_prev_year = False` → fichier corrompu, uniquement J-1 (sans màj de N-1)
    """
    cal_year_col = "CalYear" if "CalYear" in traffic_df.columns else "Year"
    current_cal_year = int(traffic_df[cal_year_col].max())
    print(f"   📅 Année civile courante détectée : {current_cal_year}")

    traffic_curr = traffic_df[traffic_df[cal_year_col] == current_cal_year].copy()
    traffic_curr = traffic_curr.drop_duplicates(subset=["Entity", "Day"])

    merged = traffic_curr.merge(delays_df, on=["Entity", "Day"], how="left")
    merged = merged.drop_duplicates(subset=["Entity", "Day"])

    delay_cols = ["capacityStaffing", "weather", "other", "disruption", "totalDelayPrev"]
    for col in delay_cols:
        merged[col] = merged[col].fillna(0).astype(int)

    # Délai total en minutes entières = somme exacte des 4 causes entières
    merged["totalDelay"] = (
        merged["capacityStaffing"]
        + merged["weather"]
        + merged["other"]
        + merged["disruption"]
    )

    is_corrupted, reason = has_french_zero_flights(merged)

    if not is_corrupted:
        print(f"   ✅ Intégrité OK ({reason}) → Mode nominal : mise à jour annuelle complète (N et N-1).")
        target_df = merged
        update_prev_year = True
    else:
        yesterday = pd.Timestamp.now(tz="Europe/Paris").date() - timedelta(days=1)
        print(f"   ⚠️  Corruption détectée ({reason}).")
        print(f"   🛡️  Passage en mode dégradé : restriction à J-1 ({yesterday}) sans mise à jour de N-1.")

        target_df = merged[merged["Day"].dt.date == yesterday].copy()
        if target_df.empty:
            print(f"   ⚠️  Aucune donnée trouvée pour J-1 ({yesterday}). Aucune écriture en BDD.")
            return [], False

        j1_corrupted, j1_reason = has_french_zero_flights(target_df)
        if j1_corrupted:
            print(f"   ❌ J-1 ({yesterday}) invalide ({j1_reason}). Insertion annulée.")
            return [], False

        update_prev_year = False

    rows: list[tuple] = []
    for _, r in target_df.iterrows():
        acc_short = r["Entity"].replace(" ACC", "").strip()
        rows.append((
            r["Day"].date(),                  # date
            int(r["Year"]),                   # year
            int(r["Week"]),                   # week
            int(r["DayOfWeek"]),              # day_of_week
            r["Entity"],                      # acc_code
            acc_short,                        # acc_short
            int(r["Flights"]),                # flights
            int(r["Flights Previous Year"]),  # flights_prev_year
            int(r["capacityStaffing"]),       # delay_capacity_staffing
            int(r["weather"]),                # delay_weather
            int(r["other"]),                  # delay_other
            int(r["disruption"]),             # delay_disruption
            int(r["totalDelay"]),             # delay_total
            int(r["totalDelayPrev"]),         # delay_total_prev_year
        ))

    return rows, update_prev_year


# ─────────────────────────────────────────────────────────────
# INSERTION / UPSERT DANS NHOST
# ─────────────────────────────────────────────────────────────
UPSERT_SQL_NOMINAL = """
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
        flights = EXCLUDED.flights,
        flights_prev_year = EXCLUDED.flights_prev_year,
        delay_capacity_staffing = EXCLUDED.delay_capacity_staffing,
        delay_weather = EXCLUDED.delay_weather,
        delay_other = EXCLUDED.delay_other,
        delay_disruption = EXCLUDED.delay_disruption,
        delay_total = EXCLUDED.delay_total,
        delay_total_prev_year = EXCLUDED.delay_total_prev_year,
        updated_at = NOW()
"""

UPSERT_SQL_DEGRADED_J1 = """
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
        flights = EXCLUDED.flights,
        delay_capacity_staffing = EXCLUDED.delay_capacity_staffing,
        delay_weather = EXCLUDED.delay_weather,
        delay_other = EXCLUDED.delay_other,
        delay_disruption = EXCLUDED.delay_disruption,
        delay_total = EXCLUDED.delay_total,
        updated_at = NOW()
"""


def upsert_to_nhost(rows: list[tuple], update_prev_year: bool) -> None:
    if not rows:
        print("   ⚠️  Aucune ligne à insérer.")
        return

    sql = UPSERT_SQL_NOMINAL if update_prev_year else UPSERT_SQL_DEGRADED_J1
    mode_label = "nominal (année complète, N + N-1)" if update_prev_year else "dégradé (J-1 uniquement, sans màj N-1)"

    print(f"   🔌 Connexion à Nhost — mode {mode_label}...")
    conn = psycopg2.connect(NHOST_DB_URL)
    try:
        with conn.cursor() as cur:
            execute_values(cur, sql, rows, page_size=500)
        conn.commit()
        print(f"   ✅ {len(rows):,} lignes insérées / mises à jour dans Nhost.")
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
        sys.exit(1)

    print("\n📊 [1/4] Trafic (ACCs.xlsx)...")
    traffic_bytes = fetch_file(URL_TRAFFIC)
    traffic_df = parse_traffic(traffic_bytes)
    print(f"   ✅ {len(traffic_df):,} lignes de trafic analysées")

    print("\n⏱️  [2/4] Délais par ACC (ACC_ATFM_Delay.xlsx)...")
    delays_bytes = fetch_file(URL_DELAYS)
    delays_df = parse_delays(delays_bytes)
    print(f"   ✅ {len(delays_df):,} lignes de délais analysées")

    print("\n🔗 [3/4] Fusion trafic + délais & contrôle d'intégrité...")
    rows, update_prev_year = build_rows(traffic_df, delays_df)
    print(f"   ✅ {len(rows):,} lignes prêtes pour insertion")

    print("\n💾 [4/4] Écriture dans Nhost...")
    upsert_to_nhost(rows, update_prev_year=update_prev_year)

    print(f"\n✅ Opération terminée à {datetime.now().isoformat()}")


if __name__ == "__main__":
    main()