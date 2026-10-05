/**
 * Types pour les données du dashboard
 */
export interface DelayCause {
  capacityStaffing: number[];
  weather: number[];
  other: number[];
  disruption: number[];
  total: number[];
  isEstimated?: boolean;
}

export interface AnnualData {
  weeks: number[];
  flights: number[];
  flightsPreviousYear: number[];
  delays: DelayCause;
  delaysPreviousYear?: DelayCause;
  totalDelaysPreviousYear: number[];
}

export interface WeeklyDayData {
  days: string[];
  dates: string[];
  flights: number[];
  flightsPreviousYear: number[];
  delays: DelayCause;
  /**
   * N-1 : le `total` est réel, les 4 causes sont estimées (isEstimated=true).
   * Utilisé tel quel par la plupart des vues ; View4 mode N-1 n'utilise
   * que `total` pour condenser la comparaison sur le délai global.
   */
  delaysPreviousYear?: DelayCause;
}

export interface WeeklyData {
  [weekNumber: string]: WeeklyDayData;
}

export interface AccData {
  annual: AnnualData;
  weekly: WeeklyData;
}

export interface AnnualSeries {
  weeks: number[];
  flights: number[];
  flightsPrev: number[];
  totalDelays: number[];
  totalDelaysPrev: number[];
  delaysPerFlight: number[];
  delaysPerFlightPrev: number[];
  delaysByCause: DelayCause;
  delaysByCausePrev: DelayCause;
}

export interface WeekData {
  days: string[];
  dates: string[];
  flights: (number | null)[];
  flightsPreviousYear: (number | null)[];
  delays: {
    capacityStaffing: (number | null)[];
    weather: (number | null)[];
    other: (number | null)[];
    disruption: (number | null)[];
    total: (number | null)[];
  };
  delaysPreviousYear?: {
    capacityStaffing: (number | null)[];
    weather: (number | null)[];
    other: (number | null)[];
    disruption: (number | null)[];
    total: (number | null)[];
    isEstimated?: boolean;
  };
  lastDayWithData: number;
}

export interface KPI {
  flights: number;
  flightsPrev: number;
  totalDelay: number;
  totalDelayPrev: number;
  avgDelay: number;
  avgDelayPrev: number;
  flightsPct: number;
  delayPct: number;
  avgDelayPct: number;
}

export interface AnnualKPI extends KPI {
  lastWeekWithData: number;
}

/**
 * Trouve la dernière semaine avec des données réelles (au moins un vol)
 */
export function getLastWeekWithData(accData: AccData): number {
  if (!accData?.annual?.flights) return 1;
  const flights = accData.annual.flights;
  const lastIdx = flights.reduce((last, f, idx) => (f > 0 ? idx + 1 : last), 0);
  return lastIdx || 1;
}

/**
 * Retourne le numéro de la dernière semaine complète (7 jours de données)
 */
export function getLastCompleteWeek(accData: AccData): number {
  if (!accData?.weekly) return 1;
  let lastComplete = 1;
  for (let w = 1; w <= 53; w++) {
    const weekData = getWeekData(accData, w);
    if (!weekData) continue;
    if (weekData.lastDayWithData === 6) {
      lastComplete = w;
    }
  }
  return lastComplete;
}

/**
 * Calcule les séries annuelles pour un ACC
 * NOTE : Les causes N-1 annuelles sont estimées (voir fetch_data.py).
 */
export function getAnnualSeries(accData: AccData): AnnualSeries {
  const annual = accData.annual || {};
  const weeks = annual.weeks || Array.from({ length: 53 }, (_, i) => i + 1);
  const flights = (annual.flights || []).map(v => Math.round(v || 0));
  const flightsPrev = (annual.flightsPreviousYear || []).map(v => Math.round(v || 0));
  const delays = annual.delays || {};

  const capacityStaffing = (delays.capacityStaffing || []).map(v => Math.round(v || 0));
  const weather = (delays.weather || []).map(v => Math.round(v || 0));
  const other = (delays.other || []).map(v => Math.round(v || 0));
  const disruption = (delays.disruption || []).map(v => Math.round(v || 0));

  const totalDelays = capacityStaffing.map(
    (v, i) => v + (weather[i] || 0) + (other[i] || 0) + (disruption[i] || 0)
  );

  const totalDelaysPrev = (annual.totalDelaysPreviousYear || []).map(v => Math.round(v || 0));

  const prevDelays = annual.delaysPreviousYear;
  let capacityStaffingPrev, weatherPrev, otherPrev, disruptionPrev;
  if (prevDelays && prevDelays.capacityStaffing) {
    capacityStaffingPrev = (prevDelays.capacityStaffing || []).map(v => Math.round(v || 0));
    weatherPrev = (prevDelays.weather || []).map(v => Math.round(v || 0));
    otherPrev = (prevDelays.other || []).map(v => Math.round(v || 0));
    disruptionPrev = (prevDelays.disruption || []).map(v => Math.round(v || 0));
  } else {
    capacityStaffingPrev = totalDelaysPrev.map(t => Math.round(t * 0.70));
    weatherPrev = totalDelaysPrev.map(t => Math.round(t * 0.20));
    otherPrev = totalDelaysPrev.map(t => Math.round(t * 0.10));
    disruptionPrev = totalDelaysPrev.map(() => 0);
  }

  const delaysPerFlight = totalDelays.map((d, i) => (flights[i] ? d / flights[i] : 0));
  const delaysPerFlightPrev = totalDelaysPrev.map((d, i) => (flightsPrev[i] ? d / flightsPrev[i] : 0));

  return {
    weeks,
    flights,
    flightsPrev,
    totalDelays,
    totalDelaysPrev,
    delaysPerFlight,
    delaysPerFlightPrev,
    delaysByCause: { capacityStaffing, weather, other, disruption },
    delaysByCausePrev: { capacityStaffing: capacityStaffingPrev, weather: weatherPrev, other: otherPrev, disruption: disruptionPrev },
  };
}

export function getPieData(data: AccData | WeeklyDayData, year: 'current' | 'previous' = 'current'): Array<{ name: string; value: number }> {
  const causeKeys = ['capacityStaffing', 'weather', 'other', 'disruption'];
  const labels = ['Capacity / Staffing', 'Weather', 'Other', 'Disruption'];
  let delays;

  if (data.annual) {
    const annual = data.annual;
    if (year === 'current') {
      delays = annual.delays;
    } else {
      const prev = annual.delaysPreviousYear;
      if (prev) {
        delays = prev;
      } else {
        const totalPrev = annual.totalDelaysPreviousYear?.reduce((a, b) => a + Math.round(b || 0), 0) || 0;
        return [
          { name: labels[0], value: Math.round(totalPrev * 0.70) },
          { name: labels[1], value: Math.round(totalPrev * 0.20) },
          { name: labels[2], value: Math.round(totalPrev * 0.10) },
          { name: labels[3], value: 0 },
        ];
      }
    }
  } else {
    delays = data.delays || {};
  }

  const totals = causeKeys.map(key => {
    const arr = delays[key] || [];
    return Math.round(arr.reduce((a, b) => a + (b || 0), 0));
  });

  const total = totals.reduce((a, b) => a + b, 0);
  if (total === 0) return causeKeys.map((_, i) => ({ name: labels[i], value: 0 }));

  return causeKeys.map((key, i) => ({ name: labels[i], value: totals[i] }));
}

/**
 * Retourne les données d'une semaine.
 *
 * @param year  'current'  → semaine N (vols + délais réels, ventilés par cause)
 *              'previous' → même semaine ISO de l'année N-1 :
 *                           vols N-1 réels, causes N-1 estimées
 *                           (total N-1 = réel).
 *
 * La structure retournée est identique dans les deux cas : 4 causes + total.
 * Les vues qui ne veulent PAS afficher les causes estimées N-1 (View4 mode
 * N-1) peuvent simplement lire `delays.total` et ignorer les causes.
 */
export function getWeekData(
  accData: AccData,
  weekNumber: number,
  year: 'current' | 'previous' = 'current'
): WeekData | null {
  if (!accData.weekly || !accData.weekly[weekNumber]) return null;

  const week = accData.weekly[weekNumber];
  const isPrev = year === 'previous';

  const flights = isPrev ? (week.flightsPreviousYear || []) : (week.flights || []);
  const flightsOther = isPrev ? (week.flights || []) : (week.flightsPreviousYear || []);

  const delays = isPrev ? (week.delaysPreviousYear || {}) : (week.delays || {});

  const cap = (delays.capacityStaffing || []).map(v => Math.round(v || 0));
  const wea = (delays.weather || []).map(v => Math.round(v || 0));
  const oth = (delays.other || []).map(v => Math.round(v || 0));
  const dis = (delays.disruption || []).map(v => Math.round(v || 0));

  const total = (delays.total && delays.total.length
    ? delays.total
    : cap.map((v, i) => v + (wea[i] || 0) + (oth[i] || 0) + (dis[i] || 0))
  ).map(v => Math.round(v || 0));

  const lastDayWithData = flights.reduce((last, f, idx) => (f > 0 ? idx : last), -1);

  const cleanArray = (arr: (number | null)[] | undefined) =>
    (arr || []).map((v, i) => (i > lastDayWithData ? null : Math.round(v || 0)));

  return {
    days: week.days,
    dates: week.dates,
    flights: cleanArray(flights),
    flightsPreviousYear: cleanArray(flightsOther),
    delays: {
      capacityStaffing: cleanArray(cap),
      weather: cleanArray(wea),
      other: cleanArray(oth),
      disruption: cleanArray(dis),
      total: cleanArray(total),
    },
    delaysPreviousYear:
      !isPrev && week.delaysPreviousYear
        ? {
            capacityStaffing: cleanArray(week.delaysPreviousYear.capacityStaffing),
            weather: cleanArray(week.delaysPreviousYear.weather),
            other: cleanArray(week.delaysPreviousYear.other),
            disruption: cleanArray(week.delaysPreviousYear.disruption),
            total: cleanArray(week.delaysPreviousYear.total),
            isEstimated: week.delaysPreviousYear.isEstimated,
          }
        : undefined,
    lastDayWithData,
  };
}

export function computeWeekKPIs(weekData: WeekData, weekPrevData: WeekData | null, maxDays?: number): KPI {
  const sumValid = (arr: (number | null)[]): number => {
    if (!arr || !Array.isArray(arr)) return 0;
    const truncated = maxDays !== undefined ? arr.slice(0, maxDays) : arr;
    return truncated
      .filter((v): v is number => v !== null && v !== undefined && !isNaN(v))
      .reduce((a, b) => a + Math.round(b), 0);
  };

  const flights = sumValid(weekData.flights);
  const flightsPrev = weekPrevData ? sumValid(weekPrevData.flights) : 0;
  const totalDelay = sumValid(weekData.delays.total);
  const totalDelayPrev = weekPrevData ? sumValid(weekPrevData.delays.total) : 0;

  const avgDelay = flights > 0 ? totalDelay / flights : 0;
  const avgDelayPrev = flightsPrev > 0 ? totalDelayPrev / flightsPrev : 0;

  return {
    flights, flightsPrev, totalDelay, totalDelayPrev, avgDelay, avgDelayPrev,
    flightsPct: flightsPrev > 0 ? ((flights - flightsPrev) / flightsPrev) * 100 : 0,
    delayPct: totalDelayPrev > 0 ? ((totalDelay - totalDelayPrev) / totalDelayPrev) * 100 : 0,
    avgDelayPct: avgDelayPrev > 0 ? ((avgDelay - avgDelayPrev) / avgDelayPrev) * 100 : 0,
  };
}

export function computeAnnualKPIs(accData: AccData, maxWeek?: number): AnnualKPI {
  const annual = accData.annual;
  const flightsArr = annual.flights;
  const flightsPrevArr = annual.flightsPreviousYear;
  const delays = annual.delays;

  const cap = delays.capacityStaffing.map(v => Math.round(v || 0));
  const wea = delays.weather.map(v => Math.round(v || 0));
  const oth = delays.other.map(v => Math.round(v || 0));
  const dis = delays.disruption.map(v => Math.round(v || 0));

  const totalDelaysArr = cap.map((v, i) => v + (wea[i] || 0) + (oth[i] || 0) + (dis[i] || 0));
  const totalDelaysPrevArr = annual.totalDelaysPreviousYear.map(v => Math.round(v || 0));

  let lastWeekWithData: number;
  if (maxWeek !== undefined && maxWeek !== null) {
    lastWeekWithData = maxWeek;
  } else {
    lastWeekWithData = flightsArr.reduce((last, f, idx) => (f > 0 ? idx + 1 : last), 0);
  }

  const flights = flightsArr.slice(0, lastWeekWithData).reduce((a, b) => a + Math.round(b || 0), 0);
  const flightsPrev = flightsPrevArr.slice(0, lastWeekWithData).reduce((a, b) => a + Math.round(b || 0), 0);
  const totalDelay = totalDelaysArr.slice(0, lastWeekWithData).reduce((a, b) => a + Math.round(b || 0), 0);
  const totalDelayPrev = totalDelaysPrevArr.slice(0, lastWeekWithData).reduce((a, b) => a + Math.round(b || 0), 0);

  const avgDelay = flights > 0 ? totalDelay / flights : 0;
  const avgDelayPrev = flightsPrev > 0 ? totalDelayPrev / flightsPrev : 0;

  return {
    flights, flightsPrev, totalDelay, totalDelayPrev, avgDelay, avgDelayPrev, lastWeekWithData,
    flightsPct: flightsPrev > 0 ? ((flights - flightsPrev) / flightsPrev) * 100 : 0,
    delayPct: totalDelayPrev > 0 ? ((totalDelay - totalDelayPrev) / totalDelayPrev) * 100 : 0,
    avgDelayPct: avgDelayPrev > 0 ? ((avgDelay - avgDelayPrev) / avgDelayPrev) * 100 : 0,
  };
}