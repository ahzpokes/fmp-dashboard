#!/usr/bin/env python3
"""
Restaure les 4 colonnes de cause de délai (cap, wea, oth, dis)
depuis traffic_data.json, UNIQUEMENT là où elles sont à 0 en BDD
alors que delay_total > 0.

Ne touche à rien d'autre. Idempotent.
"""
import json
import os
import sys
from pathlib import Path

import psycopg2
from psycopg2.extras import execute_values

SCRIPT_DIR = Path(__file__).resolve().parent
JSON_FILE = SCRIPT_DIR.parent / "src" / "data" / "traffic_data.json"
NHOST_DB_URL = os.environ.get("NHOST_DB_URL")


def extract_from_json() -> list[tuple]:
    """Retourne [(date, acc_code, cap, wea, oth, dis), ...]"""
    with open(JSON_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    out = []
    for acc_code, acc in data.items():
        if acc_code == "generated_at":
            continue
        weekly = acc.get("weekly") or {}
        for _, w in weekly.items():
            dates = w["dates"]
            d = w["delays"]
            for i, date_str in enumerate(dates):
                if not date_str:
                    continue
                cap = int(d["capacityStaffing"][i])
                wea = int(d["weather"][i])
                oth = int(d["other"][i])
                dis = int(d["disruption"][i])
                if cap + wea + oth + dis > 0:
                    out.append((date_str, acc_code, cap, wea, oth, dis))
    return out


def restore(values: list[tuple]) -> None:
    conn = psycopg2.connect(NHOST_DB_URL)
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT COUNT(*) FROM daily_acc_data
                WHERE delay_total > 0
                  AND delay_capacity_staffing = 0
                  AND delay_weather = 0
                  AND delay_other = 0
                  AND delay_disruption = 0;
            """)
            before = cur.fetchone()[0]
            print(f"   📊 Lignes corrompues en BDD avant restauration : {before}")

            if before == 0:
                print("   ✅ Rien à restaurer.")
                return

            sql = """
                WITH v(date, acc_code, cap, wea, oth, dis) AS (VALUES %s)
                UPDATE daily_acc_data d
                SET
                    delay_capacity_staffing = CASE
                        WHEN d.delay_capacity_staffing = 0 AND v.cap > 0
                             THEN v.cap ELSE d.delay_capacity_staffing END,
                    delay_weather = CASE
                        WHEN d.delay_weather = 0 AND v.wea > 0
                             THEN v.wea ELSE d.delay_weather END,
                    delay_other = CASE
                        WHEN d.delay_other = 0 AND v.oth > 0
                             THEN v.oth ELSE d.delay_other END,
                    delay_disruption = CASE
                        WHEN d.delay_disruption = 0 AND v.dis > 0
                             THEN v.dis ELSE d.delay_disruption END,
                    updated_at = NOW()
                FROM v
                WHERE d.date::date = v.date::date
                  AND d.acc_code = v.acc_code
                  AND d.delay_total > 0
                  AND d.delay_capacity_staffing = 0
                  AND d.delay_weather = 0
                  AND d.delay_other = 0
                  AND d.delay_disruption = 0;
            """
            execute_values(cur, sql, values, page_size=500)
            print(f"   ✅ UPDATE exécuté sur {cur.rowcount} lignes.")

            cur.execute("""
                SELECT COUNT(*) FROM daily_acc_data
                WHERE delay_total > 0
                  AND delay_capacity_staffing = 0
                  AND delay_weather = 0
                  AND delay_other = 0
                  AND delay_disruption = 0;
            """)
            after = cur.fetchone()[0]
            print(f"   📊 Lignes corrompues après restauration : {after}")
        conn.commit()
    except Exception as e:
        conn.rollback()
        print(f"   ❌ Erreur : {e}")
        raise
    finally:
        conn.close()


def main():
    print("=" * 60)
    print("🔧 Restauration ciblée des causes de délai")
    print("=" * 60)

    if not NHOST_DB_URL:
        print("❌ NHOST_DB_URL manquant.")
        sys.exit(1)

    if not JSON_FILE.exists():
        print(f"❌ Fichier introuvable : {JSON_FILE}")
        sys.exit(1)

    print(f"\n📖 Lecture : {JSON_FILE}")
    values = extract_from_json()
    print(f"   ✅ {len(values):,} (jour, ACC) avec causes > 0 dans le JSON")

    print("\n💾 UPDATE ciblé…")
    restore(values)

    print("\n✅ Terminé.")


if __name__ == "__main__":
    main()