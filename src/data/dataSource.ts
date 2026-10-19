/**
 * Couche d'accès aux données du dashboard.
 *
 * Charge tous les ACCs en une seule requête GraphQL et transforme
 * les lignes journalières plates en structure AccData.
 */

import { graphqlRequest } from '../nhost';
import type { AccData, AnnualData, WeeklyData, DelayCause } from '../utils/dataHelpers';

// ─────────────────────────────────────────────────────────────
// Types bruts GraphQL
// ─────────────────────────────────────────────────────────────

interface RawDailyRow {
  acc_code: string;
  date: string;
  week: number;
  day_of_week: number;
  flights: number;
  flights_prev_year: number;
  delay_capacity_staffing: number;
  delay_weather: number;
  delay_other: number;
  delay_disruption: number;
  delay_total: number;
  delay_total_prev_year: number;
}

interface GraphQLResponse {
  daily_acc_data: RawDailyRow[];
}

// ─────────────────────────────────────────────────────────────
// Requête GraphQL — une seule pour tout charger
// ─────────────────────────────────────────────────────────────

const GET_ALL_ACC_DATA = `
  query GetAllAccData($year: Int!) {
    daily_acc_data(
      where: { year: { _eq: $year } }
      order_by: { acc_code: asc, date: asc }
    ) {
      acc_code
      date
      week
      day_of_week
      flights
      flights_prev_year
      delay_capacity_staffing
      delay_weather
      delay_other
      delay_disruption
      delay_total
      delay_total_prev_year
    }
  }
`;

// ─────────────────────────────────────────────────────────────
// Transformation : lignes plates → AccData
// ─────────────────────────────────────────────────────────────

const DAYS_FR = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

function transformRowsToAccData(rows: RawDailyRow[]): AccData {
  const flights = new Array(53).fill(0);
  const flightsPrev = new Array(53).fill(0);
  const cap = new Array(53).fill(0);
  const wea = new Array(53).fill(0);
  const oth = new Array(53).fill(0);
  const dis = new Array(53).fill(0);
  const total = new Array(53).fill(0);
  const totalPrev = new Array(53).fill(0);

  const weekly: WeeklyData = {};

  for (const row of rows) {
    const wIdx = row.week - 1;
    if (wIdx < 0 || wIdx > 52) continue;

    flights[wIdx] += row.flights;
    flightsPrev[wIdx] += row.flights_prev_year;
    cap[wIdx] += row.delay_capacity_staffing;
    wea[wIdx] += row.delay_weather;
    oth[wIdx] += row.delay_other;
    dis[wIdx] += row.delay_disruption;
    total[wIdx] += row.delay_total;
    totalPrev[wIdx] += row.delay_total_prev_year;

    const weekKey = String(row.week);
    if (!weekly[weekKey]) {
      weekly[weekKey] = {
        days: DAYS_FR,
        dates: new Array(7).fill(''),
        flights: new Array(7).fill(0),
        flightsPreviousYear: new Array(7).fill(0),
        delays: {
          capacityStaffing: new Array(7).fill(0),
          weather: new Array(7).fill(0),
          other: new Array(7).fill(0),
          disruption: new Array(7).fill(0),
          total: new Array(7).fill(0),
        },
        delaysPreviousYear: {
          capacityStaffing: new Array(7).fill(0),
          weather: new Array(7).fill(0),
          other: new Array(7).fill(0),
          disruption: new Array(7).fill(0),
          total: new Array(7).fill(0),
          isEstimated: true,
        },
      };
    }

    const wd = row.day_of_week;
    if (wd < 0 || wd > 6) continue;

    const w = weekly[weekKey];
    w.dates[wd] = row.date;
    w.flights[wd] = row.flights;
    w.flightsPreviousYear[wd] = row.flights_prev_year;
    w.delays.capacityStaffing[wd] = row.delay_capacity_staffing;
    w.delays.weather[wd] = row.delay_weather;
    w.delays.other[wd] = row.delay_other;
    w.delays.disruption[wd] = row.delay_disruption;
    w.delays.total[wd] = row.delay_total;
    w.delaysPreviousYear!.total![wd] = row.delay_total_prev_year;
  }

  // Estimation N-1 hebdomadaire (ratio 70/20/10 comme fetch_data.py)
  for (const weekKey of Object.keys(weekly)) {
    const w = weekly[weekKey];
    const totalN = w.delays.total;
    const prevN = w.delaysPreviousYear!;
    for (let i = 0; i < 7; i++) {
      const totN = totalN[i] ?? 0;
      const totN1 = prevN.total![i] ?? 0;
      if (totN > 0 && totN1 > 0) {
        const ratio = totN1 / totN;
        prevN.capacityStaffing![i] = Math.round((w.delays.capacityStaffing[i] ?? 0) * ratio);
        prevN.weather![i] = Math.round((w.delays.weather[i] ?? 0) * ratio);
        prevN.other![i] = Math.round((w.delays.other[i] ?? 0) * ratio);
        prevN.disruption![i] = Math.round((w.delays.disruption[i] ?? 0) * ratio);
      }
    }
  }

  const delaysAnnual: DelayCause = {
    capacityStaffing: cap,
    weather: wea,
    other: oth,
    disruption: dis,
    total,
  };

  const delaysPrevAnnual: DelayCause = {
    capacityStaffing: totalPrev.map(t => Math.round(t * 0.70)),
    weather: totalPrev.map(t => Math.round(t * 0.20)),
    other: totalPrev.map(t => Math.round(t * 0.10)),
    disruption: totalPrev.map(() => 0),
    total: totalPrev,
    isEstimated: true,
  };

  const annual: AnnualData = {
    weeks: Array.from({ length: 53 }, (_, i) => i + 1),
    flights,
    flightsPreviousYear: flightsPrev,
    delays: delaysAnnual,
    delaysPreviousYear: delaysPrevAnnual,
    totalDelaysPreviousYear: totalPrev,
  };

  return { annual, weekly };
}

// ─────────────────────────────────────────────────────────────
// Fonction publique : charge tous les ACCs en une requête
// ─────────────────────────────────────────────────────────────

export interface LoadAllResult {
  accs: Record<string, AccData>;
  generatedAt: string;
}

/**
 * Charge tous les ACCs d'une année en une seule requête GraphQL.
 * Retourne un objet { [accCode]: AccData } + la date de mise à jour.
 */
export async function loadAllAccData(
  year: number = new Date().getFullYear()
): Promise<LoadAllResult> {
  const result = await graphqlRequest<GraphQLResponse>(GET_ALL_ACC_DATA, { year });
  const rows = result.daily_acc_data ?? [];

  // Grouper les lignes par ACC
  const grouped: Record<string, RawDailyRow[]> = {};
  let latestDate = '';

  for (const row of rows) {
    if (!grouped[row.acc_code]) grouped[row.acc_code] = [];
    grouped[row.acc_code].push(row);
    if (row.date > latestDate) latestDate = row.date;
  }

  // Transformer chaque groupe en AccData
  const accs: Record<string, AccData> = {};
  for (const [accCode, accRows] of Object.entries(grouped)) {
    accs[accCode] = transformRowsToAccData(accRows);
  }

  const generatedAt = latestDate
    ? new Date(latestDate + 'T00:00:00').toISOString()
    : new Date().toISOString();

  return { accs, generatedAt };
}