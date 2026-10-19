#!/usr/bin/env python3
"""
backfill_from_json.py
─────────────────────
Recharge dans Nhost les lignes journalières manquantes (janvier/février 2026)
à partir du traffic_data.json généré avant le bug Eurocontrol.

Réutilise la MÊME logique d'UPSERT anti-corruption que fetch_data_bdd.py :
- une valeur existante n'est jamais écrasée par un 0
- idempotent : peut être relancé sans risque
"""

import json
import os
import sys
from collections import Counter
from pathlib import Path

import psycopg2
from psycopg2.extras import execute_values

SCRIPT_DIR = Path(__file__).resolve().parent
JSON_FILE  = SCRIPT_DIR.parent / "src" / "data" / "traffic_data.json"
NHOST_DB_URL = os.environ.get("NHOST_DB_URL")


# ─────────────────────────────────────────────────────────────
# LECTURE JSON → LIGNES SQL
# ─────────────────────────────────────────────────────────────
def build_rows_from_json(json_path: Path) -> list[tuple]:
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    rows: list[tuple] = []
    skipped_days = 0

    for acc_code, acc in data.items():
        if acc_code == "generated_at":
            continue

        acc_short = acc_code.replace(" ACC", "").strip()
        weekly = acc.get("weekly") or {}

        for week_str, w in weekly.items():
            week = int(week_str)
            dates          = w["dates"]                       # ["", "", "", "2026-01-01", ...]
            flights        = w["flights"]
            flights_prev   = w["flightsPreviousYear"]
            d              = w["delays"]
            dp             = w.get("delaysPreviousYear", {})

            cap, wea, oth, dis = (
                d["capacityStaffing"], d["weather"], d["other"], d["disruption"]
            )
            total = d["total"]
            total_prev = dp.get("total", [0] * 7)             # seul champ N-1 fiable

            for i, date_str in enumerate(dates):
                if not date_str:                              # jour hors année
                    skipped_days += 1
                    continue

                year, _, _ = map(int, date_str.split("-"))
                dow = i                                       # Lundi=0 … Dimanche=6

                rows.append((
                    date_str,                                 # date
                    year,                                     # year
                    week,                                     # week
                    dow,                                      # day_of_week
                    acc_code,                                 # acc_code
                    acc_short,                                # acc_short
                    int(flights[i]),                          # flights
                    int(flights_prev[i]),                     # flights_prev_year
                    int(cap[i]),                              # delay_capacity_staffing
                    int(wea[i]),                              # delay_weather
                    int(oth[i]),                              # delay_other
                    int(dis[i]),                              # delay_disruption
                    int(total[i]),                            # delay_total
                    int(total_prev[i]),                       # delay_total_prev_year
                ))

    print(f"   ℹ️  {skipped_days} jours vides (hors année) ignorés")
    return rows


# ─────────────────────────────────────────────────────────────
# UPSERT (identique à fetch_data_bdd.py)
# ─────────────────────────────────────────────────────────────
UPSERT_SQL = """
    INSERT INTO daily_acc_data (
        date, year, week, day_of_week,
        acc_code, acc_short,
        flights, flights_prev_year,
        delay_capacity_staffing, delay_weather,
        delay_other, delay_disruption,
        delay_total, delay_total_prev_year
    ) VALUES %s
    ON CONFLICT (date, acc_code) DO UPDATE SET
        year         = EXCLUDED.year,
        week         = EXCLUDED.week,
        day_of_week  = EXCLUDED.day_of_week,
        acc_short    = EXCLUDED.acc_short,

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

        delay_capacity_staffing = EXCLUDED.delay_capacity_staffing,
        delay_weather           = EXCLUDED.delay_weather,
        delay_other             = EXCLUDED.delay_other,
        delay_disruption        = EXCLUDED.delay_disruption,

        updated_at = NOW()
"""


def upsert(rows: list[tuple]) -> None:
    if not rows:
        print("   ⚠️  Rien à insérer.")
        return

    print("   🔌 Connexion à Nhost…")
    conn = psycopg2.connect(NHOST_DB_URL)
    try:
        with conn.cursor() as cur:
            execute_values(cur, UPSERT_SQL, rows, page_size=500)
        conn.commit()
        print(f"   ✅ {len(rows)} lignes upsertées.")
    except Exception as e:
        conn.rollback()
        print(f"   ❌ Erreur : {e}")
        raise
    finally:
        conn.close()


# ─────────────────────────────────────────────────────────────
# VÉRIFICATION POST-BACKFILL
# ─────────────────────────────────────────────────────────────
def report() -> None:
    print("\n📊 Répartition par mois (après backfill) :")
    conn = psycopg2.connect(NHOST_DB_URL)
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT date_trunc('month', date)::date AS mois,
                       COUNT(*)              AS nb_lignes,
                       COUNT(DISTINCT acc_code) AS nb_accs,
                       SUM(flights)          AS vols
                FROM daily_acc_data
                GROUP BY 1
                ORDER BY 1;
            """)
            print(f"   {'Mois':<12} {'Lignes':>8} {'ACC':>5} {'Vols':>12}")
            for mois, nb, nb_accs, vols in cur.fetchall():
                print(f"   {str(mois):<12} {nb:>8} {nb_accs:>5} {vols or 0:>12,}")
    finally:
        conn.close()


# ─────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────
def main():
    print("=" * 60)
    print("🧩 Backfill Nhost depuis traffic_data.json")
    print("=" * 60)

    if not NHOST_DB_URL:
        print("❌ NHOST_DB_URL manquant.")
        sys.exit(1)

    if not JSON_FILE.exists():
        print(f"❌ Fichier introuvable : {JSON_FILE}")
        sys.exit(1)

    print(f"\n📖 Lecture : {JSON_FILE}")
    rows = build_rows_from_json(JSON_FILE)
    print(f"   ✅ {len(rows):,} lignes extraites du JSON")

    # Aperçu
    months = Counter(r[0][:7] for r in rows)     # "YYYY-MM"
    print("\n   Aperçu par mois dans le JSON :")
    for m in sorted(months):
        print(f"     • {m} : {months[m]:>5} lignes")

    # Confirmation
    resp = input("\n❓ Lancer l'UPSERT dans Nhost ? [y/N] ").strip().lower()
    if resp != "y":
        print("Annulé.")
        return

    print("\n💾 UPSERT…")
    upsert(rows)

    report()
    print("\n✅ Backfill terminé.")


if __name__ == "__main__":
    main()