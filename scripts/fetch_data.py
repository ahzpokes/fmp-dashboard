#!/usr/bin/env python3
"""
Script ETL Eurocontrol ACC Data
Croise :
  1. ACCs.xlsx            → Trafic (vols N et N-1 par ACC)
  2. ACC_ATFM_Delay.xlsx  → Délais ATFM réels PAR ACC (déjà ventilés)
Génère traffic_data.json dans racine/src/data/.

NOTE : La répartition par cause des délais N-1 est estimée à partir
du ratio entre N et N-1 (proportionnelle). Ces valeurs ne sont PAS
les vraies causes N-1 (non fournies dans les sources).
"""

import io
import json
from pathlib import Path
from datetime import datetime
import pandas as pd
import requests

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
OUTPUT_FILE = PROJECT_ROOT / "src" / "data" / "traffic_data.json"

URL_TRAFFIC = "https://www.eurocontrol.int/Economics/Download/ACCs.xlsx"
URL_DELAYS  = "https://www.eurocontrol.int/Economics/Download/ACC_ATFM_Delay.xlsx"

DAYS_FR = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"]


def fetch_file(url: str) -> io.BytesIO:
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
    print(f"   📥 Téléchargement : {url}")
    resp = requests.get(url, headers=headers, timeout=120)
    resp.raise_for_status()
    return io.BytesIO(resp.content)


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

    return df[["Entity", "Day", "capacityStaffing", "weather", "other", "disruption", "totalDelay", "totalDelayPrev"]]


def merge_and_aggregate(traffic_df: pd.DataFrame, delays_df: pd.DataFrame) -> dict:
    current_year = traffic_df["Year"].max()
    print(f"   📅 Année courante détectée : {current_year}")

    traffic_curr = traffic_df[traffic_df["Year"] == current_year].copy()
    traffic_curr = traffic_curr.drop_duplicates(subset=["Entity", "Day"])

    merged = traffic_curr.merge(delays_df, on=["Entity", "Day"], how="left")
    merged = merged.drop_duplicates(subset=["Entity", "Day"])

    for col in ["capacityStaffing", "weather", "other", "disruption", "totalDelay", "totalDelayPrev"]:
        merged[col] = merged[col].fillna(0)

    result = {}
    entities = sorted(merged["Entity"].dropna().unique())

    for entity in entities:
        ent = merged[merged["Entity"] == entity].sort_values("Day")
        if ent.empty:
            continue

        weeks_list = list(range(1, 54))
        flights_n = [0] * 53
        flights_n1 = [0] * 53
        cap_n = [0.0] * 53
        wea_n = [0.0] * 53
        oth_n = [0.0] * 53
        dis_n = [0.0] * 53
        total_n1 = [0.0] * 53

        for w, g in ent.groupby("Week"):
            if 1 <= w <= 53:
                g = g[g["Year"] == current_year]
                if g.empty:
                    continue
                i = w - 1
                flights_n[i] = int(g["Flights"].sum())
                flights_n1[i] = int(g["Flights Previous Year"].sum())
                cap_n[i] = float(g["capacityStaffing"].sum())
                wea_n[i] = float(g["weather"].sum())
                oth_n[i] = float(g["other"].sum())
                dis_n[i] = float(g["disruption"].sum())
                total_n1[i] = float(g["totalDelayPrev"].sum())

        total_n = [round(cap_n[i] + wea_n[i] + oth_n[i] + dis_n[i]) for i in range(53)]

        # ⚠️ ESTIMATION : la répartition par cause N-1 n'est PAS fournie
        # dans les sources Excel. On applique un ratio proportionnel.
        cap_n1, wea_n1, oth_n1, dis_n1 = [], [], [], []
        for i in range(53):
            if total_n[i] > 0:
                ratio = total_n1[i] / total_n[i]
                cap_n1.append(round(cap_n[i] * ratio))
                wea_n1.append(round(wea_n[i] * ratio))
                oth_n1.append(round(oth_n[i] * ratio))
                dis_n1.append(round(dis_n[i] * ratio))
            else:
                cap_n1.append(0); wea_n1.append(0); oth_n1.append(0); dis_n1.append(0)

        delays_annual = {
            "capacityStaffing": [round(v) for v in cap_n],
            "weather": [round(v) for v in wea_n],
            "other": [round(v) for v in oth_n],
            "disruption": [round(v) for v in dis_n],
            "total": total_n,
        }

        delays_prev_annual = {
            "capacityStaffing": cap_n1,
            "weather": wea_n1,
            "other": oth_n1,
            "disruption": dis_n1,
            "total": [round(v) for v in total_n1],
            "isEstimated": True,  # Marqueur pour l'UI
        }

        weekly = {}
        for w_num, w_df in ent.groupby("Week"):
            if w_num < 1 or w_num > 53:
                continue

            d_fl = [0] * 7
            d_fl1 = [0] * 7
            d_cap = [0.0] * 7
            d_wea = [0.0] * 7
            d_oth = [0.0] * 7
            d_dis = [0.0] * 7
            d_dat = [""] * 7

            for _, row in w_df.iterrows():
                wd = int(row["DayOfWeek"])
                if 0 <= wd <= 6:
                    d_fl[wd] = int(row["Flights"])
                    d_fl1[wd] = int(row["Flights Previous Year"])
                    d_cap[wd] = float(row["capacityStaffing"])
                    d_wea[wd] = float(row["weather"])
                    d_oth[wd] = float(row["other"])
                    d_dis[wd] = float(row["disruption"])
                    d_dat[wd] = row["Day"].strftime("%Y-%m-%d")

            d_tot = [round(d_cap[i] + d_wea[i] + d_oth[i] + d_dis[i]) for i in range(7)]

            weekly[str(w_num)] = {
                "days": DAYS_FR,
                "dates": d_dat,
                "flights": d_fl,
                "flightsPreviousYear": d_fl1,
                "delays": {
                    "capacityStaffing": [round(v) for v in d_cap],
                    "weather": [round(v) for v in d_wea],
                    "other": [round(v) for v in d_oth],
                    "disruption": [round(v) for v in d_dis],
                    "total": d_tot,
                },
            }

        result[entity] = {
            "annual": {
                "weeks": weeks_list,
                "flights": flights_n,
                "flightsPreviousYear": flights_n1,
                "delays": delays_annual,
                "delaysPreviousYear": delays_prev_annual,
                "totalDelaysPreviousYear": [round(v) for v in total_n1],
            },
            "weekly": weekly,
        }

    return result


def main():
    print("=" * 60)
    print("🚀 ETL Eurocontrol – Trafic + Délais réels par ACC")
    print("=" * 60)

    print("\n📊 [1/4] Trafic (ACCs.xlsx)...")
    traffic_bytes = fetch_file(URL_TRAFFIC)
    traffic_df = parse_traffic(traffic_bytes)
    print(f"   ✅ {len(traffic_df):,} lignes de trafic analysées")

    print("\n⏱️  [2/4] Délais par ACC (ACC_ATFM_Delay.xlsx)...")
    delays_bytes = fetch_file(URL_DELAYS)
    delays_df = parse_delays(delays_bytes)
    print(f"   ✅ {len(delays_df):,} lignes de délais analysées")

    print("\n🔗 [3/4] Jointure Entity + Day...")
    data = merge_and_aggregate(traffic_df, delays_df)
    print(f"   ✅ {len(data)} ACCs consolidés avec succès")

    generated_at = datetime.now().isoformat()
    data["generated_at"] = generated_at
    print(f"   🕒 Date de génération : {generated_at}")

    print("\n💾 [4/4] Écriture du fichier JSON final...")
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    size_kb = OUTPUT_FILE.stat().st_size / 1024
    print(f"\n✅ Opération terminée ! ({size_kb:.1f} KB)")


if __name__ == "__main__":
    main()