import React from 'react';
import { computeAnnualKPIs, getLastCompleteWeek } from '../utils/dataHelpers';

const TrendBadge = ({ pct, invertColors = false }) => {
  // invertColors : true si une hausse est mauvaise (délais), false si hausse bonne (vols)
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
      <span className="theme-text-muted font-normal ml-1">vs N-1</span>
    </div>
  );
};

const KPIGlobal = ({ data }) => {
  const maxWeek = getLastCompleteWeek(data);
  const {
    flights, flightsPrev, totalDelay, totalDelayPrev,
    avgDelay, avgDelayPrev, flightsPct, delayPct, avgDelayPct,
    lastWeekWithData,
  } = computeAnnualKPIs(data, maxWeek);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {/* Statut / Contexte */}
      <div className="theme-card p-5 rounded-lg">
        <div className="text-xs uppercase tracking-wider theme-text-muted mb-2">Statut des Données</div>
        <div className="text-2xl font-bold" style={{ color: 'var(--accent-amber)' }}>
          Semaine {lastWeekWithData} complète
        </div>
        <div className="text-xs theme-text-muted mt-1">Consolidé à date</div>
      </div>

      {/* Vols */}
      <div className="theme-card p-5 rounded-lg">
        <div className="text-xs uppercase tracking-wider theme-text-muted mb-2">Nombre de Vols</div>
        <div className="text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          {flights.toLocaleString('fr-FR')}
        </div>
        <TrendBadge pct={flightsPct} invertColors={false} />
      </div>

      {/* Délai total */}
      <div className="theme-card p-5 rounded-lg">
        <div className="text-xs uppercase tracking-wider theme-text-muted mb-2">Délai Total</div>
        <div className="text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          {totalDelay.toLocaleString('fr-FR')}
          <span className="text-sm font-normal theme-text-muted ml-1">min</span>
        </div>
        <TrendBadge pct={delayPct} invertColors={true} />
      </div>

      {/* Délai moyen */}
      <div className="theme-card p-5 rounded-lg">
        <div className="text-xs uppercase tracking-wider theme-text-muted mb-2">Délai Moyen / Vol</div>
        <div className="text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          {avgDelay.toFixed(2)}
          <span className="text-sm font-normal theme-text-muted ml-1">min</span>
        </div>
        <TrendBadge pct={avgDelayPct} invertColors={true} />
      </div>
    </div>
  );
};

export default KPIGlobal;