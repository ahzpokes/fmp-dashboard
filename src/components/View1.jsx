import React, { useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Cell
} from 'recharts';
import { getAnnualSeries, getLastCompleteWeek, computeAnnualKPIs } from '../utils/dataHelpers';
import { CAUSE_COLORS } from '../utils/theme';

const formatNumber = (value) => {
  if (value === undefined || value === null) return '';
  return value.toLocaleString('fr-FR');
};

// Couleurs de l'écartogramme
const COLOR_BETTER = '#10b981'; // vert : N sous N-1 (mieux)
const COLOR_WORSE = '#ef4444';  // rouge : N au-dessus de N-1 (moins bien)

// Tooltip pour l'écartogramme
const GapTooltip = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload;

  if (data.gapPct === null || data.gapPct === undefined) return null;

  const isBetter = data.gapPct <= 0;
  const color = isBetter ? COLOR_BETTER : COLOR_WORSE;
  const currentYear = new Date().getFullYear();
  const previousYear = currentYear - 1;

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
      }}>
        Semaine {data.week}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 12px' }}>
        <span style={{ color: 'var(--accent-amber)' }}>{currentYear}</span>
        <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
          {data.delayN !== null ? `${data.delayN.toFixed(2)} min` : 'N/A'}
        </span>
        <span style={{ color: 'var(--accent-cyan)' }}>{previousYear}</span>
        <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', opacity: 0.8 }}>
          {data.delayN1 !== null ? `${data.delayN1.toFixed(2)} min` : 'N/A'}
        </span>
        <div style={{ gridColumn: 'span 2', borderTop: '1px solid var(--border-color)', margin: '6px 0' }} />
        <span style={{ fontWeight: 'bold', color }}>Écart</span>
        <span style={{ textAlign: 'right', fontWeight: 'bold', color, fontVariantNumeric: 'tabular-nums' }}>
          {data.gapPct >= 0 ? '+' : ''}{data.gapPct.toFixed(1)}%
        </span>
      </div>
      <div style={{ marginTop: 6, fontSize: 11, color, fontStyle: 'italic' }}>
        {isBetter ? '✓ Mieux que ' + previousYear : '✗ Moins bien que ' + previousYear}
      </div>
    </div>
  );
};

const View1 = ({ data, isActive }) => {
  const currentYear = new Date().getFullYear();
  const previousYear = currentYear - 1;

  const {
    weeks,
    flights,
    flightsPrev,
    delaysPerFlight,
    delaysPerFlightPrev,
    delaysByCause: { capacityStaffing, weather, other, disruption },
  } = getAnnualSeries(data);

  const lastWeekWithData = getLastCompleteWeek(data);

  // ─── Données de l'écartogramme ───
  const gapData = useMemo(() => {
    return weeks
      .map((w, idx) => {
        const hasFlights = (flights[idx] || 0) > 0;
        const hasFlightsPrev = (flightsPrev[idx] || 0) > 0;
        const dN = hasFlights ? delaysPerFlight[idx] : null;
        const dN1 = hasFlightsPrev ? delaysPerFlightPrev[idx] : null;

        let gapPct = null;
        if (dN !== null && dN1 !== null && dN1 > 0) {
          gapPct = ((dN - dN1) / dN1) * 100;
        }

        return {
          week: w,
          delayN: dN,
          delayN1: dN1,
          gapPct,
        };
      })
      .filter(d => d.week <= lastWeekWithData);
  }, [weeks, flights, flightsPrev, delaysPerFlight, delaysPerFlightPrev, lastWeekWithData]);

  // Bornes Y symétriques autour de 0
  const maxAbs = Math.max(
    10,
    ...gapData.map(d => Math.abs(d.gapPct || 0))
  );
  const yBound = Math.ceil(maxAbs / 10) * 10;

  // Stats utiles pour les points clés
  const goodWeeksCount = gapData.filter(d => d.gapPct !== null && d.gapPct <= 0).length;
  const badWeeksCount = gapData.filter(d => d.gapPct !== null && d.gapPct > 0).length;
  const totalWeeks = goodWeeksCount + badWeeksCount;

  const kpis = useMemo(() => {
    return computeAnnualKPIs(data, lastWeekWithData);
  }, [data, lastWeekWithData]);

  const dominantCause = useMemo(() => {
    const causes = [
      { key: 'Capacity / Staffing', value: capacityStaffing.slice(0, lastWeekWithData).reduce((a, b) => a + (b || 0), 0), color: CAUSE_COLORS.capacity },
      { key: 'Weather', value: weather.slice(0, lastWeekWithData).reduce((a, b) => a + (b || 0), 0), color: CAUSE_COLORS.weather },
      { key: 'Other', value: other.slice(0, lastWeekWithData).reduce((a, b) => a + (b || 0), 0), color: CAUSE_COLORS.other },
      { key: 'Disruption', value: disruption.slice(0, lastWeekWithData).reduce((a, b) => a + (b || 0), 0), color: CAUSE_COLORS.disruption },
    ];
    const total = causes.reduce((sum, c) => sum + c.value, 0) || 1;
    const sorted = [...causes].sort((a, b) => b.value - a.value);
    return {
      ...sorted[0],
      pct: (sorted[0].value / total) * 100,
    };
  }, [capacityStaffing, weather, other, disruption, lastWeekWithData]);

  useEffect(() => {
    if (isActive) {
      const timer = setTimeout(() => window.dispatchEvent(new Event('resize')), 100);
      return () => clearTimeout(timer);
    }
  }, [isActive]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Écartogramme */}
        <div className="theme-card p-5 rounded-lg lg:col-span-2">
          <div className="flex justify-between items-start mb-4 flex-wrap gap-2">
            <div>
              <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                Écart de Délai Moyen / Vol – Semaine par Semaine
              </h3>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                Écart (%) de {currentYear} par rapport à {previousYear}
              </p>
            </div>
            <div className="flex gap-3 text-xs theme-text-secondary">
              <span className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: COLOR_BETTER }} />
                Mieux que {previousYear}
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: COLOR_WORSE }} />
                Moins bien
              </span>
            </div>
          </div>

          <div style={{ width: '100%', height: 380 }}>
            <ResponsiveContainer>
              <BarChart data={gapData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                <XAxis
                  dataKey="week"
                  stroke="var(--text-muted)"
                  type="category"
                  domain={[1, lastWeekWithData]}
                  ticks={Array.from({ length: lastWeekWithData }, (_, i) => i + 1)}
                  interval={Math.max(0, Math.floor(lastWeekWithData / 15) - 1)}
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  stroke="var(--text-muted)"
                  domain={[-yBound, yBound]}
                  ticks={[-yBound, -yBound / 2, 0, yBound / 2, yBound]}
                  tickFormatter={(v) => `${v}%`}
                  width={50}
                />
                <Tooltip content={<GapTooltip />} cursor={{ fill: 'var(--bg-hover)' }} />
                <ReferenceLine y={0} stroke="var(--text-muted)" strokeWidth={1} />

                <Bar dataKey="gapPct" radius={[3, 3, 0, 0]}>
                  {gapData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={(entry.gapPct ?? 0) <= 0 ? COLOR_BETTER : COLOR_WORSE}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Bandeau récap */}
          {totalWeeks > 0 && (
            <div className="mt-3 flex flex-wrap items-center justify-center gap-4 text-xs"
              style={{ color: 'var(--text-secondary)' }}>
              <span>
                <strong style={{ color: COLOR_BETTER }}>{goodWeeksCount}</strong> semaines meilleures
              </span>
              <span className="theme-text-muted">·</span>
              <span>
                <strong style={{ color: COLOR_WORSE }}>{badWeeksCount}</strong> semaines moins bonnes
              </span>
              <span className="theme-text-muted">·</span>
              <span>
                Soit <strong style={{ color: 'var(--text-primary)' }}>
                  {((goodWeeksCount / totalWeeks) * 100).toFixed(0)}%
                </strong> de semaines en amélioration
              </span>
            </div>
          )}
        </div>

        {/* Carte "Points Clés" */}
        <div className="theme-card p-5 rounded-lg flex flex-col">
          <h3 className="text-base font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <svg className="w-5 h-5" style={{ color: 'var(--accent-amber)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Points Clés
          </h3>
          <ul className="text-sm space-y-3 flex-1" style={{ color: 'var(--text-secondary)' }}>
            <li className="flex gap-2">
              <span style={{ color: 'var(--text-muted)' }}>•</span>
              <span>
                Le trafic cumulé est{' '}
                <strong style={{ color: kpis.flightsPct >= 0 ? COLOR_BETTER : COLOR_WORSE }}>
                  {kpis.flightsPct >= 0 ? 'en hausse' : 'en baisse'} de {Math.abs(kpis.flightsPct).toFixed(2)}%
                </strong>
                {' '}par rapport à {previousYear} ({formatNumber(kpis.flights)} vols).
              </span>
            </li>
            <li className="flex gap-2">
              <span style={{ color: 'var(--text-muted)' }}>•</span>
              <span>
                Le délai moyen par vol est{' '}
                <strong style={{ color: kpis.avgDelayPct < 0 ? COLOR_BETTER : COLOR_WORSE }}>
                  {kpis.avgDelayPct < 0 ? 'en baisse' : 'en hausse'} de {Math.abs(kpis.avgDelayPct).toFixed(2)}%
                </strong>
                {' '}à {kpis.avgDelay.toFixed(2)} min/vol.
              </span>
            </li>
            <li className="flex gap-2">
              <span style={{ color: 'var(--text-muted)' }}>•</span>
              <span>
                <strong style={{ color: COLOR_BETTER }}>{goodWeeksCount}</strong> semaines sur {totalWeeks} ont été meilleures que {previousYear}
                {' '}({((goodWeeksCount / totalWeeks) * 100).toFixed(0)}%).
              </span>
            </li>
            <li className="flex gap-2">
              <span style={{ color: 'var(--text-muted)' }}>•</span>
              <span>
                La cause principale des retards est{' '}
                <strong style={{ color: dominantCause.color }}>{dominantCause.key}</strong>
                {' '}avec {dominantCause.pct.toFixed(0)}% du total.
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default View1;