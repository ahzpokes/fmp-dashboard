import React, { useMemo } from 'react';
import { FRENCH_ACC } from '../utils/theme';

const Header = ({
  selectedAcc,
  setSelectedAcc,
  lastUpdate,
  accList,
  lastCompleteWeekLabel,
  theme,
  toggleTheme,
}) => {
  // Séparer les ACC DSNA des autres ACC
  const { dsnaAccs, otherAccs } = useMemo(() => {
    const dsna = accList.filter(acc => FRENCH_ACC.includes(acc));
    const others = accList.filter(acc => !FRENCH_ACC.includes(acc));
    return { dsnaAccs: dsna, otherAccs: others };
  }, [accList]);

  return (
    <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
      <div className="flex items-center gap-4 flex-wrap">
        <h1 className="text-2xl font-bold tracking-wide" style={{ color: 'var(--text-primary)' }}>
          Performance Trafic & Délais
        </h1>
        <select
          value={selectedAcc}
          onChange={(e) => setSelectedAcc(e.target.value)}
          className="rounded px-3 py-1.5 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
          style={{
            backgroundColor: 'var(--bg-card)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)',
          }}
        >
          {dsnaAccs.length > 0 && (
            <optgroup label="ACC Français (DSNA)">
              {dsnaAccs.map((acc) => (
                <option key={acc} value={acc}>{acc}</option>
              ))}
            </optgroup>
          )}
          {otherAccs.length > 0 && (
            <optgroup label="Autres ACC Européens">
              {otherAccs.map((acc) => (
                <option key={acc} value={acc}>{acc}</option>
              ))}
            </optgroup>
          )}
        </select>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs italic theme-text-muted flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Mise à jour : {lastUpdate.toLocaleString('fr-FR')}
        </span>
        {lastCompleteWeekLabel && (
          <span className="text-xs font-semibold border-l pl-3"
            style={{
              color: 'var(--accent-amber)',
              borderColor: 'var(--border-color)',
            }}>
            {lastCompleteWeekLabel}
          </span>
        )}
        {/* Toggle Dark / Light */}
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
          className="p-2 rounded-md border transition-colors"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-color)',
            color: 'var(--text-secondary)',
          }}
        >
          {theme === 'dark' ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
};

export default Header;