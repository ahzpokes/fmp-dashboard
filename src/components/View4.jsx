import React, { useState, useMemo, useEffect } from 'react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, ReferenceLine
} from 'recharts';
import { getWeekData, getLastWeekWithData, computeWeekKPIs } from '../utils/dataHelpers';
import { CAUSE_COLORS, CAUSE_COLORS_PREV } from '../utils/theme';
import { WeeklyLegend } from './ChartLegends';

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
};

const CustomChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;

  const dayIndex = DAYS.indexOf(label);
  if (dayIndex === -1) return null;

  const firstPayload = payload[0];
  const datesS = firstPayload.payload?.datesS;
  const datesS1 = firstPayload.payload?.datesS1;
  const dateS = datesS && datesS[dayIndex] ? formatDate(datesS[dayIndex]) : '';
  const dateS1 = datesS1 && datesS1[dayIndex] ? formatDate(datesS1[dayIndex]) : '';

  const valueMap = {};
  payload.forEach(entry => { valueMap[entry.dataKey] = entry.value; });

  const causeKeys = ['Capacity', 'Weather', 'Other'];

  const totalS = causeKeys.reduce((sum, k) => sum + (valueMap[`${k} S`] ?? 0), 0);
  const totalS1 = causeKeys.reduce((sum, k) => sum + (valueMap[`${k} S-1`] ?? 0), 0);

  const rows = [
    { key: 'Capacity', label: 'Capacity', color: CAUSE_COLORS.capacity },
    { key: 'Weather', label: 'Weather', color: CAUSE_COLORS.weather },
    { key: 'Other', label: 'Other', color: CAUSE_COLORS.other },
  ];

  return (
    <div style={{
      backgroundColor: 'var(--bg-card)',
      border: '1px solid var(--border-color)',
      borderRadius: 6, padding: '10px 14px', fontSize: 12,
      color: 'var(--text-primary)', minWidth: 260,
    }}>
      <div style={{
        display: 'grid', gridTemplateColumns: 'auto 1fr 1fr', gap: 12,
        fontWeight: 'bold', marginBottom: 6,
        borderBottom: '1px solid var(--border-color)', paddingBottom: 6,
      }}>
        <span>{label}</span>
        <span style={{ color: 'var(--accent-amber)', textAlign: 'right' }}>S ({dateS})</span>
        <span style={{ color: 'var(--accent-cyan)', textAlign: 'right' }}>S-1 ({dateS1})</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr', gap: '4px 12px' }}>
        {rows.map((row, i) => (
          <React.Fragment key={i}>
            <span style={{ color: row.color, fontWeight: 500 }}>{row.label}</span>
            <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
              {valueMap[`${row.key} S`] ?? 0}
            </span>
            <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', opacity: 0.7 }}>
              {valueMap[`${row.key} S-1`] ?? 0}
            </span>
          </React.Fragment>
        ))}
        <div style={{ gridColumn: 'span 3', borderTop: '1px solid var(--border-color)', margin: '6px 0' }} />
        <span style={{ fontWeight: 'bold' }}>TOTAL DÉLAI</span>
        <span style={{ color: 'var(--accent-amber)', textAlign: 'right', fontWeight: 'bold', fontVariantNumeric: 'tabular-nums' }}>
          {totalS}
        </span>
        <span style={{ color: 'var(--accent-cyan)', textAlign: 'right', fontWeight: 'bold', fontVariantNumeric: 'tabular-nums', opacity: 0.7 }}>
          {totalS1}
        </span>
        <div style={{ gridColumn: 'span 3', borderTop: '1px solid var(--border-color)', margin: '6px 0' }} />
        <span>Vols</span>
        <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
          {valueMap['Vols S'] ?? 0}
        </span>
        <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', opacity: 0.7 }}>
          {valueMap['Vols S-1'] ?? 0}
        </span>
      </div>
    </div>
  );
};

const View4 = ({ data, isActive }) => {
  const initialWeek = useMemo(() => getLastWeekWithData(data), [data]);
  const [selectedWeek, setSelectedWeek] = useState(initialWeek);
  const [display, setDisplay] = useState('combined');

  useEffect(() => { setSelectedWeek(initialWeek); }, [initialWeek]);

  const weekData = useMemo(() => getWeekData(data, selectedWeek), [data, selectedWeek]);
  const weekPrevData = useMemo(() => getWeekData(data, selectedWeek - 1), [data, selectedWeek - 1]);

  useEffect(() => {
    if (isActive) {
      const timer = setTimeout(() => window.dispatchEvent(new Event('resize')), 100);
      return () => clearTimeout(timer);
    }
  }, [isActive, selectedWeek, display]);

  if (!weekData) {
    return <div className="text-center py-10 theme-text-muted">Aucune donnée pour la semaine {selectedWeek}</div>;
  }

  const datesS = weekData.dates || [];
  const datesS1 = weekPrevData?.dates || [];

  const dailyChartData = DAYS.map((day, idx) => {
    const hasData = idx <= weekData.lastDayWithData;
    return {
      day,
      'Capacity S': hasData ? (weekData.delays.capacityStaffing?.[idx] || 0) : null,
      'Capacity S-1': weekPrevData ? (weekPrevData.delays.capacityStaffing?.[idx] || 0) : null,
      'Weather S': hasData ? (weekData.delays.weather?.[idx] || 0) : null,
      'Weather S-1': weekPrevData ? (weekPrevData.delays.weather?.[idx] || 0) : null,
      'Other S': hasData ? (weekData.delays.other?.[idx] || 0) : null,
      'Other S-1': weekPrevData ? (weekPrevData.delays.other?.[idx] || 0) : null,
      'Vols S': hasData ? (weekData.flights?.[idx] || 0) : null,
      'Vols S-1': weekPrevData ? (weekPrevData.flights?.[idx] || 0) : null,
      datesS, datesS1,
    };
  });

  const validData = dailyChartData.filter(d => d['Vols S'] !== null);

  const maxDelay = Math.max(
    1,
    ...validData.map(d => (d['Capacity S'] || 0) + (d['Weather S'] || 0) + (d['Other S'] || 0)),
    ...(weekPrevData ? validData.map(d => (d['Capacity S-1'] || 0) + (d['Weather S-1'] || 0) + (d['Other S-1'] || 0)) : [0])
  );

  const maxFlights = Math.max(
    1,
    ...validData.map(d => d['Vols S'] || 0),
    ...(weekPrevData ? validData.map(d => d['Vols S-1'] || 0) : [0])
  );

  const minFlights = Math.min(
    ...validData.map(d => d['Vols S'] || Infinity),
    ...(weekPrevData ? validData.map(d => d['Vols S-1'] || Infinity) : [Infinity])
  );

  const padding = Math.max(200, minFlights * 0.05);
  const rawMin = Math.max(0, minFlights - padding);
  const yRightMin = Math.floor(rawMin / 100) * 100;
  const yRightMax = Math.ceil(maxFlights / 100) * 100;

  const range = yRightMax - yRightMin;
  let step = 100;
  if (range > 2000) step = 500;
  if (range > 5000) step = 1000;
  if (range > 10000) step = 2000;

  const yRightTicks = [];
  for (let v = yRightMin; v <= yRightMax; v += step) yRightTicks.push(v);
  if (yRightTicks[yRightTicks.length - 1] < yRightMax) yRightTicks.push(yRightMax);

  const yLeftMax = Math.ceil(maxDelay / 500) * 500 || 500;
  const yLeftTicks = Array.from({ length: yLeftMax / 500 + 1 }, (_, i) => i * 500);

  const totalsS = {
    capacity: weekData.delays.capacityStaffing?.reduce((a, b) => a + (b || 0), 0) || 0,
    weather: weekData.delays.weather?.reduce((a, b) => a + (b || 0), 0) || 0,
    other: weekData.delays.other?.reduce((a, b) => a + (b || 0), 0) || 0,
    disruption: weekData.delays.disruption?.reduce((a, b) => a + (b || 0), 0) || 0,
  };
  const totalsS1 = weekPrevData ? {
    capacity: weekPrevData.delays.capacityStaffing?.reduce((a, b) => a + (b || 0), 0) || 0,
    weather: weekPrevData.delays.weather?.reduce((a, b) => a + (b || 0), 0) || 0,
    other: weekPrevData.delays.other?.reduce((a, b) => a + (b || 0), 0) || 0,
    disruption: weekPrevData.delays.disruption?.reduce((a, b) => a + (b || 0), 0) || 0,
  } : { capacity: 0, weather: 0, other: 0, disruption: 0 };

  const grandTotalS = Object.values(totalsS).reduce((a, b) => a + b, 0) || 1;
  const grandTotalS1 = Object.values(totalsS1).reduce((a, b) => a + b, 0) || 1;

  const causesChartData = [
    {
      name: `S${selectedWeek - 1} (S-1)`,
      Capacity: Math.round((totalsS1.capacity / grandTotalS1) * 100),
      Weather: Math.round((totalsS1.weather / grandTotalS1) * 100),
      Other: Math.round((totalsS1.other / grandTotalS1) * 100),
      Disruption: Math.round((totalsS1.disruption / grandTotalS1) * 100),
    },
    {
      name: `S${selectedWeek} (S)`,
      Capacity: Math.round((totalsS.capacity / grandTotalS) * 100),
      Weather: Math.round((totalsS.weather / grandTotalS) * 100),
      Other: Math.round((totalsS.other / grandTotalS) * 100),
      Disruption: Math.round((totalsS.disruption / grandTotalS) * 100),
    },
  ];

  const maxDays = weekData.lastDayWithData + 1;
  const kpis = computeWeekKPIs(weekData, weekPrevData, maxDays);

  const availableWeeks = Object.keys(data.weekly || {}).map(Number).sort((a, b) => b - a);
  const lastDayName = weekData.lastDayWithData >= 0 ? DAYS[weekData.lastDayWithData] : 'Aucun';

  const showBars = display === 'combined' || display === 'delays';
  const showLines = display === 'combined' || display === 'traffic';

  const KpiBadge = ({ pct, invertColors }) => {
    const isPositive = invertColors ? pct < 0 : pct >= 0;
    const color = isPositive ? '#10b981' : '#ef4444';
    const bg = isPositive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)';
    const arrow = pct >= 0 ? 'M5 10l7-7m0 0l7 7m-7-7v18' : 'M19 14l-7 7m0 0l-7-7m7 7V3';
    return (
      <div className="flex items-center gap-1 mt-1 text-xs font-semibold px-2 py-0.5 rounded w-fit"
        style={{ color, backgroundColor: bg }}>
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={arrow} />
        </svg>
        {pct >= 0 ? '+' : ''}{pct.toFixed(2)}%
        <span className="theme-text-muted font-normal ml-1">vs S-1</span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="theme-card p-4 rounded-lg flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <label className="font-semibold text-sm theme-text-secondary">Semaine à analyser :</label>
          <select
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(Number(e.target.value))}
            className="font-bold rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-amber-500"
            style={{
              backgroundColor: 'var(--bg-card-alt)',
              color: 'var(--accent-amber)',
              border: '1px solid var(--border-color)',
            }}
          >
            {availableWeeks.map(w => (<option key={w} value={w}>Semaine {w}</option>))}
          </select>
        </div>
        <div className="text-xs theme-text-secondary">
          Comparaison : <span style={{ color: 'var(--accent-amber)', fontWeight: 'bold' }}>S{selectedWeek}</span> vs{' '}
          <span style={{ color: 'var(--accent-cyan)', fontWeight: 'bold' }}>S{selectedWeek - 1}</span>
          {' · '}
          <span className="theme-text-muted">Données jusqu'au <strong style={{ color: 'var(--accent-amber)' }}>{lastDayName}</strong></span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="theme-card p-5 rounded-lg xl:col-span-7">
          <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
            <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
              Trafic & Délai par Causes - Jours
            </h3>
            {/* Toggle avec style "Option B" : fond neutre + texte orange pour l'actif */}
            <div className="flex rounded-lg p-1 text-xs"
              style={{ backgroundColor: 'var(--bg-page)', border: '1px solid var(--border-color)' }}>
              {[
                { id: 'combined', label: 'Combiné' },
                { id: 'delays', label: 'Délais' },
                { id: 'traffic', label: 'Trafic' },
              ].map(opt => {
                const isActive = display === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setDisplay(opt.id)}
                    className="px-3 py-1 rounded-md font-semibold transition-all"
                    style={{
                      backgroundColor: 'transparent',
                      color: isActive ? 'var(--accent-amber)' : 'var(--text-secondary)',
                      border: isActive ? '1px solid var(--accent-amber)' : '1px solid transparent',
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div style={{ width: '100%', height: 340 }}>
            <ResponsiveContainer>
              <ComposedChart data={dailyChartData} barCategoryGap="20%" barGap={0}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis dataKey="day" stroke="var(--text-muted)" />
                <YAxis yAxisId="left" stroke="var(--text-muted)" domain={[0, yLeftMax]} ticks={yLeftTicks} />
                <YAxis yAxisId="right" orientation="right" stroke="var(--text-muted)" domain={[yRightMin, yRightMax]} ticks={yRightTicks} />
                <Tooltip content={<CustomChartTooltip />} cursor={false} />
                <Legend content={<WeeklyLegend selectedWeek={selectedWeek} />} />

                {showBars && (
                  <>
                    <Bar yAxisId="left" dataKey="Capacity S" stackId="S" fill={CAUSE_COLORS.capacity} />
                    <Bar yAxisId="left" dataKey="Weather S" stackId="S" fill={CAUSE_COLORS.weather} />
                    <Bar yAxisId="left" dataKey="Other S" stackId="S" fill={CAUSE_COLORS.other} />

                    <Bar yAxisId="left" dataKey="Capacity S-1" stackId="S1" fill={CAUSE_COLORS_PREV.capacity} />
                    <Bar yAxisId="left" dataKey="Weather S-1" stackId="S1" fill={CAUSE_COLORS_PREV.weather} />
                    <Bar yAxisId="left" dataKey="Other S-1" stackId="S1" fill={CAUSE_COLORS_PREV.other} />
                  </>
                )}

                {showLines && (
                  <>
                    <Line yAxisId="right" type="monotone" dataKey="Vols S"
                      stroke="var(--line-current)" strokeWidth={3}
                      dot={{ r: 3.5, fill: 'var(--line-current)', strokeWidth: 0 }}
                      connectNulls={false} />
                    <Line yAxisId="right" type="monotone" dataKey="Vols S-1"
                      stroke="var(--line-previous)" strokeDasharray="5 5" strokeWidth={1.5}
                      dot={false} connectNulls={false} />
                  </>
                )}

                {weekData.lastDayWithData < 6 && (
                  <ReferenceLine
                    yAxisId="left"
                    x={DAYS[weekData.lastDayWithData]}
                    stroke="#ef4444"
                    strokeDasharray="3 3"
                    strokeWidth={1.5}
                    label={{ value: 'Dernière donnée', position: 'top', fill: '#ef4444', fontSize: 11 }}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="theme-card p-5 rounded-lg xl:col-span-5">
          <h3 className="text-base font-semibold mb-3 text-center" style={{ color: 'var(--text-primary)' }}>
            Répartition des Causes de Retard (%)
          </h3>
          <div style={{ width: '100%', height: 340 }}>
            <ResponsiveContainer>
              <BarChart
                data={causesChartData}
                layout="vertical"
                barCategoryGap="30%"
                margin={{ top: 20, right: 20, left: 20, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" horizontal={false} />
                <XAxis
                  type="number" domain={[0, 100]} stroke="var(--text-muted)"
                  ticks={[0, 25, 50, 75, 100]}
                  tickFormatter={(v) => `${v}%`}
                />
                <YAxis
                  type="category" dataKey="name" stroke="var(--text-muted)"
                  tick={{ fontSize: 13, fontWeight: 'bold' }}
                  width={100}
                />
                <Tooltip
                  cursor={{ fill: 'var(--bg-hover)' }}
                  contentStyle={{
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 6,
                    color: 'var(--text-primary)',
                  }}
                  formatter={(value) => `${value}%`}
                />
                <Legend />
                <Bar dataKey="Capacity" stackId="a" fill={CAUSE_COLORS.capacity} name="Capacity/Staffing" />
                <Bar dataKey="Weather" stackId="a" fill={CAUSE_COLORS.weather} name="Weather" />
                <Bar dataKey="Other" stackId="a" fill={CAUSE_COLORS.other} name="Other" />
                <Bar dataKey="Disruption" stackId="a" fill={CAUSE_COLORS.disruption} name="Disruption" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="theme-card p-5 rounded-lg">
          <div className="text-xs uppercase tracking-wider theme-text-muted mb-2">Vols sur la Semaine</div>
          <div className="text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            {kpis.flights.toLocaleString('fr-FR')}
          </div>
          <KpiBadge pct={kpis.flightsPct} invertColors={false} />
        </div>
        <div className="theme-card p-5 rounded-lg">
          <div className="text-xs uppercase tracking-wider theme-text-muted mb-2">Délai Semaine</div>
          <div className="text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            {kpis.delay.toLocaleString('fr-FR')}
            <span className="text-sm font-normal theme-text-muted ml-1">min</span>
          </div>
          <KpiBadge pct={kpis.delayPct} invertColors={true} />
        </div>
        <div className="theme-card p-5 rounded-lg">
          <div className="text-xs uppercase tracking-wider theme-text-muted mb-2">Délai Moyen / Vol</div>
          <div className="text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            {kpis.avgDelay.toFixed(2)}
            <span className="text-sm font-normal theme-text-muted ml-1">min</span>
          </div>
          <KpiBadge pct={kpis.avgDelayPct} invertColors={true} />
        </div>
      </div>
    </div>
  );
};

export default View4;