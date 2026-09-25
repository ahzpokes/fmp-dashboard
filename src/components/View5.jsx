import React, { useMemo, useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ComposedChart, Line
} from 'recharts';
import { getLastCompleteWeek } from '../utils/dataHelpers';
import { FRENCH_ACC } from '../utils/theme';

// Palette stable pour identifier chaque CRNA (partagée entre les 2 graphiques)
const CRNA_COLORS = {
  'BREST': '#00b4d8',
  'BORDEAUX': '#f59e0b',
  'MARSEILLE': '#8b5cf6',
  'REIMS': '#10b981',
  'PARIS': '#ef4444',
};

// Couleurs neutres pour la comparaison N / N-1
const COLOR_N = '#3b82f6';      // bleu vif : année en cours
const COLOR_N1 = '#93c5fd';     // bleu clair : année précédente

const formatNumber = (value) => {
  if (value === undefined || value === null) return '';
  return value.toLocaleString('fr-FR');
};

const formatCompact = (value) => {
  if (value === undefined || value === null) return '';
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return value.toString();
};

// ─── Tick personnalisé pour l'axe X (libellés colorés par CRNA) ───
const ColoredCrnaTick = ({ x, y, payload }) => {
  const color = CRNA_COLORS[payload.value] || 'var(--text-muted)';
  return (
    <text
      x={x}
      y={y + 14}
      textAnchor="middle"
      fill={color}
      fontSize={12}
      fontWeight={700}
    >
      {payload.value}
    </text>
  );
};

// ─── Tooltip du graphique délai moyen ───
const DelayBarTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  const currentYear = new Date().getFullYear();
  const previousYear = currentYear - 1;

  const valueMap = {};
  payload.forEach(entry => { valueMap[entry.dataKey] = entry.value; });

  const valN = valueMap[`delayAvg_${currentYear}`] ?? 0;
  const valN1 = valueMap[`delayAvg_${previousYear}`] ?? 0;
  const gap = valN1 > 0 ? ((valN - valN1) / valN1) * 100 : 0;
  const isBetter = gap <= 0;
  const gapColor = isBetter ? '#10b981' : '#ef4444';

  return (
    <div style={{
      backgroundColor: 'var(--bg-card)',
      border: '1px solid var(--border-color)',
      borderRadius: 6, padding: '10px 14px', fontSize: 12,
      color: 'var(--text-primary)', minWidth: 220,
    }}>
      <div style={{
        fontWeight: 'bold', borderBottom: '1px solid var(--border-color)',
        paddingBottom: 4, marginBottom: 6,
        color: CRNA_COLORS[label] || 'var(--text-primary)',
      }}>
        {label}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 12px' }}>
        <span style={{ color: 'var(--accent-amber)' }}>{currentYear}</span>
        <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
          {valN.toFixed(2)} min/vol
        </span>
        <span style={{ color: 'var(--accent-cyan)' }}>{previousYear}</span>
        <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', opacity: 0.8 }}>
          {valN1.toFixed(2)} min/vol
        </span>
        <div style={{ gridColumn: 'span 2', borderTop: '1px solid var(--border-color)', margin: '6px 0' }} />
        <span style={{ fontWeight: 'bold', color: gapColor }}>Écart</span>
        <span style={{ textAlign: 'right', fontWeight: 'bold', color: gapColor, fontVariantNumeric: 'tabular-nums' }}>
          {gap >= 0 ? '+' : ''}{gap.toFixed(1)}%
        </span>
      </div>
    </div>
  );
};

// ─── Tooltip du graphique vols ───
const FlightsTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  const sorted = [...payload].sort((a, b) => (b.value || 0) - (a.value || 0));
  return (
    <div style={{
      backgroundColor: 'var(--bg-card)',
      border: '1px solid var(--border-color)',
      borderRadius: 6, padding: '10px 14px', fontSize: 12,
      color: 'var(--text-primary)', minWidth: 180,
    }}>
      <div style={{ fontWeight: 'bold', borderBottom: '1px solid var(--border-color)', paddingBottom: 4, marginBottom: 6 }}>
        Semaine {label}
      </div>
      {sorted.map((entry, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 8, margin: '2px 0' }}>
          <span style={{ color: entry.color, fontWeight: 500 }}>{entry.name}</span>
          <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
            {formatNumber(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
};

const View5 = ({ data, isActive }) => {
  const currentYear = new Date().getFullYear();
  const previousYear = currentYear - 1;

  const [highlightedAcc, setHighlightedAcc] = useState(null);

  useEffect(() => {
    if (isActive) {
      const timer = setTimeout(() => window.dispatchEvent(new Event('resize')), 100);
      return () => clearTimeout(timer);
    }
  }, [isActive]);

  // ─── Dernière semaine commune ───
  const lastWeekWithData = useMemo(() => {
    let minComplete = 53;
    FRENCH_ACC.forEach(acc => {
      if (data[acc]) {
        const complete = getLastCompleteWeek(data[acc]);
        if (complete < minComplete) minComplete = complete;
      }
    });
    return minComplete || 1;
  }, [data]);

  // ─── Stats par CRNA (délai moyen + vols) ───
  const crnaStats = useMemo(() => {
    return FRENCH_ACC.map(acc => {
      const accData = data[acc];
      if (!accData?.annual) return null;
      const annual = accData.annual;

      const totalDelayN = (annual.delays?.total || [])
        .slice(0, lastWeekWithData)
        .reduce((a, b) => a + (b || 0), 0);

      const totalDelayN1 = (annual.delaysPreviousYear?.total || [])
        .slice(0, lastWeekWithData)
        .reduce((a, b) => a + (b || 0), 0);

      const flightsArr = annual.flights || [];
      const flightsPrevArr = annual.flightsPreviousYear || [];

      const cumulVolsN = flightsArr
        .slice(0, lastWeekWithData)
        .reduce((sum, val) => sum + Math.round(val || 0), 0);

      const cumulVolsN1 = flightsPrevArr
        .slice(0, lastWeekWithData)
        .reduce((sum, val) => sum + Math.round(val || 0), 0);

      const delayAvgN = cumulVolsN > 0 ? totalDelayN / cumulVolsN : 0;
      const delayAvgN1 = cumulVolsN1 > 0 ? totalDelayN1 / cumulVolsN1 : 0;

      const gapDelayAvgPct = delayAvgN1 > 0
        ? ((delayAvgN - delayAvgN1) / delayAvgN1) * 100
        : 0;

      const evolVolsPct = cumulVolsN1 > 0
        ? ((cumulVolsN - cumulVolsN1) / cumulVolsN1) * 100
        : 0;

      return {
        acc,
        name: acc.replace(' ACC', ''),
        color: CRNA_COLORS[acc.replace(' ACC', '')] || '#888',
        totalDelayN,
        totalDelayN1,
        cumulVolsN,
        cumulVolsN1,
        delayAvgN,
        delayAvgN1,
        gapDelayAvgPct,
        evolVolsPct,
        flightsArr,
        flightsPrevArr,
      };
    }).filter(Boolean);
  }, [data, lastWeekWithData]);

  // ─── Données graphique délai moyen ───
  const delayChartData = useMemo(() => {
    return crnaStats.map(stat => ({
      name: stat.name,
      [`delayAvg_${currentYear}`]: Number(stat.delayAvgN.toFixed(2)),
      [`delayAvg_${previousYear}`]: Number(stat.delayAvgN1.toFixed(2)),
    }));
  }, [crnaStats, currentYear, previousYear]);

  const delayYMax = useMemo(() => {
    const max = Math.max(
      ...delayChartData.map(d => Math.max(
        d[`delayAvg_${currentYear}`] || 0,
        d[`delayAvg_${previousYear}`] || 0
      ))
    );
    return Math.ceil(max * 1.15 * 10) / 10 || 1;
  }, [delayChartData, currentYear, previousYear]);

  // ─── Données graphique vols ───
  const flightsChartData = useMemo(() => {
    const points = [];
    for (let w = 1; w <= lastWeekWithData; w++) {
      const point = { week: w };
      crnaStats.forEach(stat => {
        point[stat.name] = Math.round(stat.flightsArr[w - 1] || 0);
      });
      points.push(point);
    }
    return points;
  }, [crnaStats, lastWeekWithData]);

  const { yMin, yMax, yTicks } = useMemo(() => {
    let max = 1, min = Infinity;
    crnaStats.forEach(stat => {
      for (let i = 0; i < lastWeekWithData; i++) {
        const val = stat.flightsArr[i] || 0;
        if (val > max) max = val;
        if (val < min && val > 0) min = val;
      }
    });
    if (min === Infinity) min = 0;
    const padding = Math.max(200, min * 0.2);
    const rawMin = Math.max(0, min - padding);
    const yMinV = Math.floor(rawMin / 100) * 100;
    const yMaxV = Math.ceil(max / 100) * 100;
    const range = yMaxV - yMinV;
    let step = 100;
    if (range > 2000) step = 500;
    if (range > 5000) step = 1000;
    if (range > 10000) step = 2000;
    const ticks = [];
    for (let v = yMinV; v <= yMaxV; v += step) ticks.push(v);
    if (ticks[ticks.length - 1] < yMaxV) ticks.push(yMaxV);
    return { yMin: yMinV, yMax: yMaxV, yTicks: ticks };
  }, [crnaStats, lastWeekWithData]);

  // ─── Classement par délai moyen ───
  const rankedKPIs = useMemo(() => {
    const ranked = [...crnaStats].sort((a, b) => a.delayAvgN - b.delayAvgN);
    return ranked.map((stat, idx) => ({ ...stat, rank: idx + 1 }));
  }, [crnaStats]);

  return (
    <div className="space-y-6">
      {/* ─── Graphique 1 : Délai Moyen par Vol ─── */}
      <div className="theme-card p-5 rounded-lg">
        <div className="mb-4">
          <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
            Délai Moyen par Vol — Comparaison par CRNA
          </h3>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            {currentYear} vs {previousYear} — Délai moyen = délai cumulé / nombre de vols.
            Les libellés reprennent les couleurs du graphique d'évolution ci-dessous.
          </p>
        </div>

        <div style={{ width: '100%', height: 340 }}>
          <ResponsiveContainer>
            <BarChart
              data={delayChartData}
              barCategoryGap="25%"
              barGap={4}
              margin={{ top: 20, right: 20, left: 20, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
              <XAxis
                dataKey="name"
                tick={<ColoredCrnaTick />}
                interval={0}
                height={50}
              />
              <YAxis
                stroke="var(--text-muted)"
                domain={[0, delayYMax]}
                tickFormatter={(v) => `${v.toFixed(1)}`}
                width={60}
                label={{
                  value: 'min / vol',
                  angle: -90,
                  position: 'insideLeft',
                  fill: 'var(--text-muted)',
                  fontSize: 11,
                  style: { textAnchor: 'middle' },
                }}
              />
              <Tooltip content={<DelayBarTooltip />} cursor={{ fill: 'var(--bg-hover)' }} />
              <Legend
                content={() => (
                  <div className="flex justify-center gap-4 text-xs py-2"
                    style={{ color: 'var(--text-secondary)' }}>
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: COLOR_N1 }} />
                      Délai moyen {previousYear}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: COLOR_N }} />
                      Délai moyen {currentYear}
                    </span>
                  </div>
                )}
              />
              <Bar
                dataKey={`delayAvg_${previousYear}`}
                fill={COLOR_N1}
                barSize={40}
                radius={[3, 3, 0, 0]}
              />
              <Bar
                dataKey={`delayAvg_${currentYear}`}
                fill={COLOR_N}
                barSize={40}
                radius={[3, 3, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ─── Graphique 2 : Évolution des vols ─── */}
      <div className="theme-card p-5 rounded-lg">
        <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
          <div>
            <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
              Évolution Hebdomadaire des Vols par CRNA
            </h3>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Cliquez sur une ligne de la légende pour isoler un centre
            </p>
          </div>
          {highlightedAcc && (
            <button
              onClick={() => setHighlightedAcc(null)}
              className="text-xs px-3 py-1 rounded border theme-text-secondary"
              style={{ borderColor: 'var(--border-color)' }}
            >
              ✕ Réinitialiser
            </button>
          )}
        </div>
        <div style={{ width: '100%', height: 400 }}>
          <ResponsiveContainer>
            <ComposedChart data={flightsChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
              <XAxis
                dataKey="week" stroke="var(--text-muted)" type="category"
                domain={[1, lastWeekWithData]}
                ticks={Array.from({ length: lastWeekWithData }, (_, i) => i + 1)}
                interval={Math.max(0, Math.floor(lastWeekWithData / 15) - 1)}
                tick={{ fontSize: 11 }}
              />
              <YAxis
                stroke="var(--text-muted)"
                domain={[yMin, yMax]}
                ticks={yTicks}
                tickFormatter={formatCompact}
                width={60}
              />
              <Tooltip content={<FlightsTooltip />} />
              <Legend
                onClick={(e) => {
                  const name = e.dataKey;
                  setHighlightedAcc(prev => prev === name ? null : name);
                }}
                wrapperStyle={{ cursor: 'pointer', paddingTop: 8 }}
              />
              {crnaStats.map(stat => {
                const isDimmed = highlightedAcc && highlightedAcc !== stat.name;
                const isHighlighted = highlightedAcc === stat.name;
                return (
                  <Line
                    key={stat.acc}
                    type="monotone"
                    dataKey={stat.name}
                    stroke={stat.color}
                    dot={false}
                    strokeWidth={isHighlighted ? 3.5 : 2}
                    opacity={isDimmed ? 0.15 : 1}
                    strokeOpacity={isDimmed ? 0.15 : 1}
                  />
                );
              })}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ─── Tableau récapitulatif ─── */}
      <div className="theme-card p-5 rounded-lg">
        <div className="flex justify-between items-baseline mb-4 flex-wrap gap-2">
          <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
            Classement des CRNA par Délai Moyen
          </h3>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Cumul jusqu'à la semaine {lastWeekWithData} — classement par délai moyen {currentYear}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <th className="text-left py-2 px-2 font-medium text-xs uppercase tracking-wider"
                  style={{ color: 'var(--text-muted)', width: 40 }}>#</th>
                <th className="text-left py-2 px-2 font-medium text-xs uppercase tracking-wider"
                  style={{ color: 'var(--text-muted)' }}>CRNA</th>
                <th className="text-right py-2 px-2 font-medium text-xs uppercase tracking-wider"
                  style={{ color: 'var(--text-muted)' }}>Délai moyen {currentYear}</th>
                <th className="text-right py-2 px-2 font-medium text-xs uppercase tracking-wider"
                  style={{ color: 'var(--text-muted)' }}>Délai moyen {previousYear}</th>
                <th className="text-right py-2 px-2 font-medium text-xs uppercase tracking-wider"
                  style={{ color: 'var(--text-muted)' }}>Écart</th>
                <th className="text-right py-2 px-2 font-medium text-xs uppercase tracking-wider"
                  style={{ color: 'var(--text-muted)' }}>Vols cumulés</th>
                <th className="text-right py-2 px-2 font-medium text-xs uppercase tracking-wider"
                  style={{ color: 'var(--text-muted)' }}>Évolution vols</th>
              </tr>
            </thead>
            <tbody>
              {rankedKPIs.map((stat) => {
                const isDelayBetter = stat.gapDelayAvgPct <= 0;
                const isVolsBetter = stat.evolVolsPct >= 0;
                const delayColor = isDelayBetter ? '#10b981' : '#ef4444';
                const volsColor = isVolsBetter ? '#10b981' : '#ef4444';
                const isFirst = stat.rank === 1;

                return (
                  <tr key={stat.acc}
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      backgroundColor: isFirst ? 'rgba(16,185,129,0.05)' : 'transparent',
                    }}>
                    <td className="py-3 px-2">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold"
                        style={{
                          backgroundColor: isFirst ? 'rgba(16,185,129,0.2)' : 'var(--bg-card-alt)',
                          color: isFirst ? '#10b981' : 'var(--text-secondary)',
                        }}>
                        {stat.rank}
                      </span>
                    </td>
                    <td className="py-3 px-2 font-semibold" style={{ color: stat.color }}>
                      {stat.name}
                    </td>
                    <td className="py-3 px-2 text-right font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {stat.delayAvgN.toFixed(2)} <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>min/vol</span>
                    </td>
                    <td className="py-3 px-2 text-right font-mono" style={{ color: 'var(--text-secondary)' }}>
                      {stat.delayAvgN1.toFixed(2)} <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>min/vol</span>
                    </td>
                    <td className="py-3 px-2 text-right font-semibold" style={{ color: delayColor }}>
                      {stat.gapDelayAvgPct >= 0 ? '+' : ''}{stat.gapDelayAvgPct.toFixed(1)}%
                    </td>
                    <td className="py-3 px-2 text-right font-mono" style={{ color: 'var(--text-primary)' }}>
                      {formatNumber(stat.cumulVolsN)}
                    </td>
                    <td className="py-3 px-2 text-right font-semibold" style={{ color: volsColor }}>
                      {stat.evolVolsPct >= 0 ? '+' : ''}{stat.evolVolsPct.toFixed(2)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default View5;