import React from 'react';

const OPTIONS = [
  { id: '4w', label: '4 sem' },
  { id: '12w', label: '12 sem' },
  { id: 'year', label: '1 an' },
];

const PeriodToggle = ({ value, onChange }) => {
  return (
    <div
      className="flex rounded-lg p-1 text-xs"
      style={{ backgroundColor: 'var(--bg-page)', border: '1px solid var(--border-color)' }}
    >
      {OPTIONS.map(opt => {
        const isActive = value === opt.id;
        return (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
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
  );
};

export default PeriodToggle;