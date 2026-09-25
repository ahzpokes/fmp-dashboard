import React from 'react';

const Item = ({ color, label, shape = 'square', dashed = false, faded = false }) => (
  <span className="flex items-center gap-1.5" style={{ opacity: faded ? 0.55 : 1 }}>
    {shape === 'square' && (
      <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
    )}
    {shape === 'line' && !dashed && (
      <span className="w-4 h-0.5" style={{ backgroundColor: color }} />
    )}
    {shape === 'line' && dashed && (
      <span className="w-4 h-0.5 border-t-2 border-dashed" style={{ borderColor: color }} />
    )}
    <span>{label}</span>
  </span>
);

const Container = ({ children }) => (
  <div
    className="flex flex-wrap justify-center gap-4 text-xs py-2"
    style={{ color: 'var(--text-secondary)' }}
  >
    {children}
  </div>
);

const Separator = () => (
  <span className="border-l pl-4 ml-2" style={{ borderColor: 'var(--border-color)' }} />
);

/**
 * Légende pour la Vue 1 : 4 causes + trafic N / N-1
 * Utilise des couleurs atténuées pour signaler que N-1 partage la même teinte
 */
export const CausesAndTrafficLegend = ({ currentYear, previousYear }) => (
  <Container>
    <Item color="#3b82f6" label="Capacity" />
    <Item color="#10b981" label="Weather" />
    <Item color="#f59e0b" label="Other" />
    <Item color="#ef4444" label="Disruption" />
    <span className="text-xs italic" style={{ color: 'var(--text-muted)' }}>
      (couleurs atténuées = {previousYear})
    </span>
    <Separator />
    <Item shape="line" color="var(--line-current)" label={`Vols ${currentYear}`} />
    <Item shape="line" dashed color="var(--line-previous)" label={`Vols ${previousYear}`} />
  </Container>
);

/**
 * Légende pour la Vue 2 : Délais N / N-1 + Vols N / N-1
 */
export const TrafficAndDelayLegend = ({ currentYear, previousYear }) => (
  <Container>
    <Item color="#3b82f6" label={`Délai ${currentYear}`} />
    <Item color="#93c5fd" label={`Délai ${previousYear}`} />
    <Separator />
    <Item shape="line" color="var(--line-current)" label={`Vols ${currentYear}`} />
    <Item shape="line" dashed color="var(--line-previous)" label={`Vols ${previousYear}`} />
  </Container>
);

/**
 * Légende pour la Vue 3 : 4 causes + Vols (année N seulement)
 */
export const CausesOnlyLegend = ({ currentYear }) => (
  <Container>
    <Item color="#3b82f6" label="Capacity/Staffing" />
    <Item color="#10b981" label="Weather" />
    <Item color="#f59e0b" label="Other" />
    <Item color="#ef4444" label="Disruption" />
    <Separator />
    <Item shape="line" color="var(--line-current)" label="Vols" />
  </Container>
);

/**
 * Légende pour la Vue 4 : causes S / S-1 + Vols S / S-1
 */
export const WeeklyLegend = ({ selectedWeek }) => (
  <Container>
    <Item color="#3b82f6" label="Capacity" />
    <Item color="#10b981" label="Weather" />
    <Item color="#f59e0b" label="Other" />
    <span className="text-xs italic" style={{ color: 'var(--text-muted)' }}>
      (atténué = S{selectedWeek - 1})
    </span>
    <Separator />
    <Item shape="line" color="var(--line-current)" label={`Vols S${selectedWeek}`} />
    <Item shape="line" dashed color="var(--line-previous)" label={`Vols S${selectedWeek - 1}`} />
  </Container>
);

/**
 * Légende pour le premier graphique de la Vue 5 : Délais N / N-1
 */
export const CrnaDelayLegend = ({ currentYear, previousYear }) => (
  <Container>
    <Item color="#3b82f6" label={`Délai ${currentYear}`} />
    <Item color="#93c5fd" label={`Délai ${previousYear}`} />
  </Container>
);