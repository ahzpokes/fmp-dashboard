/**
 * Palette de couleurs centralisée pour tout le dashboard.
 */

export const CAUSE_COLORS = {
  capacity: '#3b82f6',
  weather: '#10b981',
  other: '#f59e0b',
  disruption: '#ef4444',
};

export const CAUSE_COLORS_PREV = {
  capacity: '#93c5fd',
  weather: '#6ee7b7',
  other: '#fcd34d',
  disruption: '#fca5a5',
};

export const COMPARISON_COLORS = {
  current: 'var(--line-current)',
  previous: 'var(--line-previous)',
};

export const PIE_COLORS = [
  CAUSE_COLORS.capacity,
  CAUSE_COLORS.weather,
  CAUSE_COLORS.other,
  CAUSE_COLORS.disruption,
];

export const CAUSE_LABELS = {
  capacityStaffing: 'Capacity / Staffing',
  weather: 'Weather',
  other: 'Other',
  disruption: 'Disruption',
};

export const FRENCH_ACC = [
  'BREST ACC',
  'BORDEAUX ACC',
  'MARSEILLE ACC',
  'REIMS ACC',
  'PARIS ACC',
];

/**
 * Mapping slug d'URL ↔ nom d'ACC
 * Utilisé pour le routage par chemin (/reims, /brest, etc.)
 */
export const ACC_SLUGS = {
  'brest': 'BREST ACC',
  'bordeaux': 'BORDEAUX ACC',
  'marseille': 'MARSEILLE ACC',
  'reims': 'REIMS ACC',
  'paris': 'PARIS ACC',
};

export const slugToAcc = (slug) => {
  if (!slug) return null;
  return ACC_SLUGS[slug.toLowerCase()] || null;
};

export const accToSlug = (acc) => {
  const found = Object.keys(ACC_SLUGS).find(k => ACC_SLUGS[k] === acc);
  return found || 'reims';
};