import React, { useEffect, useState, useMemo } from 'react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { getAnnualSeries, getLastCompleteWeek, type AccData } from '../utils/dataHelpers';
import { TrafficAndDelayLegend } from './ChartLegends';
import PeriodToggle from './PeriodToggle';

const formatNumber = (value: number | undefined | null): string => {
  if (value === undefined || value === null) return '';
  return value.toLocaleString('fr-FR');
};

<<<<<<< HEAD:src/components/View2.jsx
const formatCompact = (value) => {
  if (value === undefined || value === null) return '';
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return value.toString();
};

const CustomChartTooltip = ({ active, payload, label }) => {
=======
interface CustomChartTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

const CustomChartTooltip = ({ active, payload, label }: CustomChartTooltipProps) => {
>>>>>>> 3fa2e07 (feat: complete migration to TypeScript, fix tsconfig, cleanup JSX duplicates & optimize Vite bundle):src/components/View2.tsx
  if (!active || !payload || !payload.length) return null;

  const currentYear = new Date().getFullYear();
  const previousYear = currentYear - 1;

  const valueMap = {};
  payload.forEach(entry => { valueMap[entry.dataKey] = entry.value; });

  const delayN = valueMap[`Délai ${currentYear}`] ?? 0;
  const delayN1 = valueMap[`Délai ${previousYear}`] ?? 0;
  const volN = valueMap[`Vols ${currentYear}`] ?? 0;
  const volN1 = valueMap[`Vols ${previousYear}`] ?? 0;

  return (
    <div style={{
      backgroundColor: 'var(--bg-card)',
      border: '1px solid var(--border-color)',
      borderRadius: 6, padding: '10px 14px', fontSize: 12,
      color: 'var(--text-primary)', minWidth: 220,
    }}>
      <div style={{
        display: 'grid', gridTemplateColumns: 'auto 1fr 1fr', gap: 12,
        fontWeight: 'bold', marginBottom: 6,
        borderBottom: '1px solid var(--border-color)', paddingBottom: 6,
      }}>
        <span>Semaine {label}</span>
        <span style={{ color: 'var(--accent-amber)', textAlign: 'right' }}>{currentYear}</span>
        <span style={{ color: 'var(--accent-cyan)', textAlign: 'right' }}>{previousYear}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr', gap: '4px 12px' }}>
        <span>Délai (min)</span>
        <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatNumber(delayN)}</span>
        <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', opacity: 0.7 }}>{formatNumber(delayN1)}</span>
        <span>Vols</span>
        <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatNumber(volN)}</span>
        <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', opacity: 0.7 }}>{formatNumber(volN1)}</span>
      </div>
    </div>
  );
};

interface View2Props {
  data: AccData;
  isActive?: boolean;
}

const View2 = ({ data, isActive }: View2Props) => {
  const currentYear = new Date().getFullYear();
  const previousYear = currentYear - 1;

  const { weeks, flights, flightsPrev, totalDelays, totalDelaysPrev } = getAnnualSeries(data);
  const lastWeekWithData = getLastCompleteWeek(data);

  const [period, setPeriod] = useState('12w');

  useEffect(() => {
    if (isActive) {
      const timer = setTimeout(() => window.dispatchEvent(new Event('resize')), 100);
      return () => clearTimeout(timer);
    }
  }, [isActive, period]);

  // Calcul de la plage de semaines selon la période sélectionnée
  const { startWeek, endWeek, periodLabel } = useMemo(() => {
    if (period === '4w') {
      return {
        startWeek: Math.max(1, lastWeekWithData - 3),
        endWeek: lastWeekWithData,
        periodLabel: '4 dernières semaines',
      };
    }
    if (period === '12w') {
      return {
        startWeek: Math.max(1, lastWeekWithData - 11),
        endWeek: lastWeekWithData,
        periodLabel: '12 dernières semaines',
      };
    }
    return {
      startWeek: 1,
      endWeek: lastWeekWithData,
      periodLabel: 'année complète',
    };
  }, [period, lastWeekWithData]);

  const chartData = useMemo(() => {
    return weeks
      .map((w, idx) => ({
        week: w,
        [`Délai ${currentYear}`]: Math.round(totalDelays[idx] || 0),
        [`Délai ${previousYear}`]: Math.round(totalDelaysPrev[idx] || 0),
        [`Vols ${currentYear}`]: Math.round(flights[idx] || 0),
        [`Vols ${previousYear}`]: Math.round(flightsPrev[idx] || 0),
      }))
      .filter(d => d.week >= startWeek && d.week <= endWeek);
  }, [weeks, totalDelays, totalDelaysPrev, flights, flightsPrev, startWeek, endWeek, currentYear, previousYear]);

  // ─── Axe GAUCHE (délais, barres) : toujours à 0 ───
  const maxDelay = Math.max(
    1,
    ...totalDelays.slice(startWeek - 1, endWeek),
    ...totalDelaysPrev.slice(startWeek - 1, endWeek)
  );
  const yLeftMax = Math.ceil(maxDelay / 500) * 500 || 500;
  const yLeftTicks = Array.from({ length: yLeftMax / 500 + 1 }, (_, i) => i * 500);

  // ─── Axe DROIT (vols, lignes) : auto-scale ───
  const { yRightMin, yRightMax, yRightTicks } = useMemo(() => {
    const flightsN = flights.slice(startWeek - 1, endWeek).filter(v => v > 0);
    const flightsN1 = flightsPrev.slice(startWeek - 1, endWeek).filter(v => v > 0);
    const allVals = [...flightsN, ...flightsN1];

    if (allVals.length === 0) {
      return { yRightMin: 0, yRightMax: 1000, yRightTicks: [0, 500, 1000] };
    }

    const min = Math.min(...allVals);
    const max = Math.max(...allVals);

    // Padding de 10% en dessous du minimum, 5% au-dessus du maximum
    const paddingBottom = Math.max(100, min * 0.10);
    const paddingTop = Math.max(100, max * 0.05);

    const rawMin = Math.max(0, min - paddingBottom);
    const rawMax = max + paddingTop;

    // Arrondi à la centaine
    const yMin = Math.floor(rawMin / 100) * 100;
    const yMax = Math.ceil(rawMax / 100) * 100;

    // Génération des ticks avec un pas adapté
    const range = yMax - yMin;
    let step = 100;
    if (range > 2000) step = 500;
    if (range > 5000) step = 1000;
    if (range > 10000) step = 2000;

    const ticks = [];
    for (let v = yMin; v <= yMax; v += step) ticks.push(v);
    if (ticks[ticks.length - 1] < yMax) ticks.push(yMax);

    return { yRightMin: yMin, yRightMax: yMax, yRightTicks: ticks };
  }, [flights, flightsPrev, startWeek, endWeek]);

  const tickInterval = chartData.length <= 14 ? 0 : Math.floor(chartData.length / 12);

  return (
    <div className="theme-card p-5 rounded-lg">
      <div className="flex justify-between items-start mb-4 flex-wrap gap-3">
        <div>
          <h3 className="text-base font-semibold text-primary">
            Trafic et Délai – {currentYear} vs {previousYear}
          </h3>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            {periodLabel} — échelle des vols auto-adaptée
          </p>
        </div>
        <PeriodToggle value={period} onChange={setPeriod} />
      </div>
      <div style={{ width: '100%', height: 420 }}>
        <ResponsiveContainer>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
            <XAxis
              dataKey="week"
              stroke="var(--text-muted)"
              type="category"
              interval={tickInterval}
              tick={{ fontSize: 11 }}
            />
            <YAxis
              yAxisId="left"
              stroke="var(--text-muted)"
              domain={[0, yLeftMax]}
              ticks={yLeftTicks}
              tickFormatter={formatCompact}
              width={60}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="var(--text-muted)"
              domain={[yRightMin, yRightMax]}
              ticks={yRightTicks}
              tickFormatter={formatCompact}
              width={60}
            />
            <Tooltip content={<CustomChartTooltip />} cursor={false} />
            <Legend content={<TrafficAndDelayLegend currentYear={currentYear} previousYear={previousYear} />} />

            <Bar yAxisId="left" dataKey={`Délai ${currentYear}`} fill="#3b82f6" />
            <Bar yAxisId="left" dataKey={`Délai ${previousYear}`} fill="#93c5fd" />
            <Line yAxisId="right" type="monotone" dataKey={`Vols ${currentYear}`}
              stroke="var(--line-current)" dot={false} strokeWidth={2.5} />
            <Line yAxisId="right" type="monotone" dataKey={`Vols ${previousYear}`}
              stroke="var(--line-previous)" dot={false} strokeWidth={2} strokeDasharray="5 5" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default View2;