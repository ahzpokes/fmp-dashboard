/**
 * Trouve la dernière semaine avec des données réelles (au moins un vol)
 */
export function getLastWeekWithData(accData) {
  if (!accData?.annual?.flights) return 1;
  const flights = accData.annual.flights;
  const lastIdx = flights.reduce((last, f, idx) => (f > 0 ? idx + 1 : last), 0);
  return lastIdx || 1;
}

/**
 * Retourne le numéro de la dernière semaine complète (7 jours de données)
 */
export function getLastCompleteWeek(accData) {
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
 * NOTE : Les causes N-1 sont estimées à partir du ratio (voir fetch_data.py).
 */
export function getAnnualSeries(accData) {
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

  // Utiliser les vraies valeurs N-1 si disponibles, sinon estimation
  const prevDelays = annual.delaysPreviousYear;
  let capacityStaffingPrev, weatherPrev, otherPrev, disruptionPrev;
  if (prevDelays && prevDelays.capacityStaffing) {
    capacityStaffingPrev = (prevDelays.capacityStaffing || []).map(v => Math.round(v || 0));
    weatherPrev = (prevDelays.weather || []).map(v => Math.round(v || 0));
    otherPrev = (prevDelays.other || []).map(v => Math.round(v || 0));
    disruptionPrev = (prevDelays.disruption || []).map(v => Math.round(v || 0));
  } else {
    // Fallback : estimation (à éviter si possible)
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

export function getPieData(data, year = 'current') {
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

export function getWeekData(accData, weekNumber) {
  if (!accData.weekly || !accData.weekly[weekNumber]) return null;

  const week = accData.weekly[weekNumber];
  const flights = week.flights || [];
  const flightsPrev = week.flightsPreviousYear || [];
  const delays = week.delays || {};

  const cap = (delays.capacityStaffing || []).map(v => Math.round(v || 0));
  const wea = (delays.weather || []).map(v => Math.round(v || 0));
  const oth = (delays.other || []).map(v => Math.round(v || 0));
  const dis = (delays.disruption || []).map(v => Math.round(v || 0));

  const total = cap.map((v, i) => v + (wea[i] || 0) + (oth[i] || 0) + (dis[i] || 0));

  const lastDayWithData = flights.reduce((last, f, idx) => (f > 0 ? idx : last), -1);

  const cleanArray = (arr) =>
    (arr || []).map((v, i) => {
      if (i > lastDayWithData) return null;
      return Math.round(v || 0);
    });

  return {
    days: week.days,
    dates: week.dates,
    flights: cleanArray(flights),
    flightsPreviousYear: cleanArray(flightsPrev),
    delays: {
      capacityStaffing: cleanArray(cap),
      weather: cleanArray(wea),
      other: cleanArray(oth),
      disruption: cleanArray(dis),
      total: cleanArray(total),
    },
    lastDayWithData,
  };
}

export function computeWeekKPIs(weekData, weekPrevData, maxDays) {
  const sumValid = (arr) => {
    if (!arr || !Array.isArray(arr)) return 0;
    const truncated = maxDays !== undefined ? arr.slice(0, maxDays) : arr;
    return truncated
      .filter(v => v !== null && v !== undefined && !isNaN(v))
      .reduce((a, b) => a + Math.round(b), 0);
  };

  const flights = sumValid(weekData.flights);
  const flightsPrev = sumValid(weekPrevData?.flights);
  const delay = sumValid(weekData.delays?.total);
  const delayPrev = sumValid(weekPrevData?.delays?.total);

  const avgDelay = flights > 0 ? delay / flights : 0;
  const avgDelayPrev = flightsPrev > 0 ? delayPrev / flightsPrev : 0;

  return {
    flights, flightsPrev, delay, delayPrev, avgDelay, avgDelayPrev,
    flightsPct: flightsPrev > 0 ? ((flights - flightsPrev) / flightsPrev) * 100 : 0,
    delayPct: delayPrev > 0 ? ((delay - delayPrev) / delayPrev) * 100 : 0,
    avgDelayPct: avgDelayPrev > 0 ? ((avgDelay - avgDelayPrev) / avgDelayPrev) * 100 : 0,
  };
}

export function computeAnnualKPIs(accData, maxWeek) {
  const annual = accData.annual || {};
  const flightsArr = annual.flights || [];
  const flightsPrevArr = annual.flightsPreviousYear || [];
  const delays = annual.delays || {};

  const cap = (delays.capacityStaffing || []).map(v => Math.round(v || 0));
  const wea = (delays.weather || []).map(v => Math.round(v || 0));
  const oth = (delays.other || []).map(v => Math.round(v || 0));
  const dis = (delays.disruption || []).map(v => Math.round(v || 0));

  const totalDelaysArr = cap.map((v, i) => v + (wea[i] || 0) + (oth[i] || 0) + (dis[i] || 0));
  const totalDelaysPrevArr = (annual.totalDelaysPreviousYear || []).map(v => Math.round(v || 0));

  let lastWeekWithData;
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