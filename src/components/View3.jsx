import React, { useEffect } from 'react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { getAnnualSeries, getLastCompleteWeek } from '../utils/dataHelpers';
import { CAUSE_COLORS } from '../utils/theme';
import { CausesOnlyLegend } from './ChartLegends';

const formatNumber = (value) => {
  if (value === undefined || value === null) return '';
  return value.toLocaleString('fr-FR');
};

const CustomChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;

  const valueMap = {};
  payload.forEach(entry => { valueMap[entry.dataKey] = entry.value; });

  const rows = [
    { key: 'Capacity/Staffing', label: 'Capacity/Staffing', color: CAUSE_COLORS.capacity },
    { key: 'Weather', label: 'Weather', color: CAUSE_COLORS.weather },
    { key: 'Other', label: 'Other', color: CAUSE_COLORS.other },
    { key: 'Disruption', label: 'Disruption', color: CAUSE_COLORS.disruption },
  ];

  const total = rows.reduce((sum, r) => sum + (valueMap[r.key] ?? 0), 0);

  return (
    <div style={{
      backgroundColor: 'var(--bg-card)',
      border: '1px solid var(--border-color)',
      borderRadius: 6, padding: '10px 14px', fontSize: 12,
      color: 'var(--text-primary)', minWidth: 220,
    }}>
      <div style={{
        display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 12,
        fontWeight: 'bold', marginBottom: 6,
        borderBottom: '1px solid var(--border-color)', paddingBottom: 6,
      }}>
        <span>Semaine {label}</span>
        <span style={{ color: 'var(--accent-amber)', textAlign: 'right' }}>
          {new Date().getFullYear()}
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 12px' }}>
        {rows.map((row, i) => (
          <React.Fragment key={i}>
            <span style={{ color: row.color, fontWeight: 500 }}>{row.label}</span>
            <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
              {formatNumber(valueMap[row.key] ?? 0)}
            </span>
          </React.Fragment>
        ))}
        <div style={{ gridColumn: 'span 2', borderTop: '1px solid var(--border-color)', margin: '6px 0' }} />
        <span style={{ fontWeight: 'bold' }}>TOTAL DÉLAI</span>
        <span style={{ color: 'var(--accent-amber)', textAlign: 'right', fontWeight: 'bold', fontVariantNumeric: 'tabular-nums' }}>
          {formatNumber(total)}
        </span>
        <span>Vols</span>
        <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
          {formatNumber(valueMap['Vols'] ?? 0)}
        </span>
      </div>
    </div>
  );
};

const View3 = ({ data, isActive }) => {
  const {
    weeks,
    flights,
    delaysByCause: { capacityStaffing, weather, other, disruption }
  } = getAnnualSeries(data);

  useEffect(() => {
    if (isActive) {
      const timer = setTimeout(() => window.dispatchEvent(new Event('resize')), 100);
      return () => clearTimeout(timer);
    }
  }, [isActive]);

  const lastWeekWithData = getLastCompleteWeek(data);

  const chartData = weeks
    .map((w, idx) => ({
      week: w,
      'Capacity/Staffing': capacityStaffing[idx] || 0,
      'Weather': weather[idx] || 0,
      'Other': other[idx] || 0,
      'Disruption': disruption[idx] || 0,
      'Vols': flights[idx] || 0,
    }))
    .filter(d => d.week <= lastWeekWithData);

  const maxDelay = Math.max(
    1,
    ...capacityStaffing.slice(0, lastWeekWithData).map((v, i) => v + (weather[i] || 0) + (other[i] || 0) + (disruption[i] || 0))
  );
  const maxFlights = Math.max(1, ...flights.slice(0, lastWeekWithData));

  const yLeftMax = Math.ceil(maxDelay / 500) * 500 || 500;
  const yLeftTicks = Array.from({ length: yLeftMax / 500 + 1 }, (_, i) => i * 500);
  const yRightMax = Math.ceil(maxFlights / 5000) * 5000 || 5000;
  const yRightTicks = Array.from({ length: yRightMax / 5000 + 1 }, (_, i) => i * 5000);

  return (
    <div className="theme-card p-5 rounded-lg">
      <h3 className="text-base font-semibold mb-3 text-center" style={{ color: 'var(--text-primary)' }}>
        Analyse des Causes de Retard {new Date().getFullYear()} (Hebdomadaire)
      </h3>
      <div style={{ width: '100%', height: 420 }}>
        <ResponsiveContainer>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
            <XAxis
              dataKey="week" stroke="var(--text-muted)" type="category"
              domain={[1, lastWeekWithData]}
              ticks={Array.from({ length: lastWeekWithData }, (_, i) => i + 1)}
              interval={0} tick={{ fontSize: 11 }}
            />
            <YAxis yAxisId="left" stroke="var(--text-muted)" domain={[0, yLeftMax]} ticks={yLeftTicks} />
            <YAxis yAxisId="right" orientation="right" stroke="var(--text-muted)" domain={[0, yRightMax]} ticks={yRightTicks} />
            <Tooltip content={<CustomChartTooltip />} cursor={false} />
            <Legend content={<CausesOnlyLegend currentYear={new Date().getFullYear()} />} />
            <Bar yAxisId="left" dataKey="Capacity/Staffing" stackId="a" fill={CAUSE_COLORS.capacity} />
            <Bar yAxisId="left" dataKey="Weather" stackId="a" fill={CAUSE_COLORS.weather} />
            <Bar yAxisId="left" dataKey="Other" stackId="a" fill={CAUSE_COLORS.other} />
            <Bar yAxisId="left" dataKey="Disruption" stackId="a" fill={CAUSE_COLORS.disruption} />
            <Line yAxisId="right" type="monotone" dataKey="Vols"
              stroke="var(--line-current)" dot={false} strokeWidth={2.5} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default View3;