import { useMemo } from 'react';
import { FRENCH_ACC } from '../utils/theme';
import '../../logo.css';

type Theme = 'light' | 'dark';

interface HeaderProps {
  selectedAcc: string;
  setSelectedAcc: (acc: string) => void;
  lastUpdate: Date;
  accList: string[];
  lastCompleteWeekLabel: string;
  theme: Theme;
  toggleTheme: () => void;
}

const RadisLogo = () => (
  <span
    className="radis-logo-inline radis-logo-inline--header pointer-events-none"
    aria-hidden="true"
  >
    <img
      src="/logo.svg?v=2"
      alt=""
      className="radis-logo-inline-svg"
      draggable={false}
    />
  </span>
);

const Header = ({
  selectedAcc,
  setSelectedAcc,
  lastUpdate,
  accList,
  lastCompleteWeekLabel,
  theme,
  toggleTheme,
}: HeaderProps) => {
  const { dsnaAccs, otherAccs } = useMemo(() => {
    const dsna = accList.filter((acc) => FRENCH_ACC.includes(acc));
    const others = accList.filter((acc) => !FRENCH_ACC.includes(acc));
    return { dsnaAccs: dsna, otherAccs: others };
  }, [accList]);

  return (
    <div className="flex flex-wrap justify-between items-center gap-4 mb-3">
      {/* Zone gauche : logo + RADAR + select ACC */}
      <div className="flex items-center gap-4 flex-wrap min-w-0">
        <div className="flex items-center gap-3 shrink-0">
          <RadisLogo />

          <svg
            viewBox="0 0 680 170"
            className="radis-text-svg"
            style={{ width: '120px', height: '30px' }}
            aria-hidden="true"
          >
            <text
              x="340"
              y="150"
              textAnchor="middle"
              fontFamily="Arial Black, Helvetica, sans-serif"
              fontSize="170"
              fontWeight="900"
              fill="#1B3A5C"
              textLength="680"
              lengthAdjust="spacingAndGlyphs"
              className="radis-text-fill"
            >
              RADIS
            </text>
          </svg>
        </div>

        <select
          value={selectedAcc}
          onChange={(e) => setSelectedAcc(e.target.value)}
          className="
            h-10 rounded-md px-3 text-sm font-semibold
            theme-card theme-border text-primary
            focus:outline-none focus:ring-2 focus:ring-amber-500
            cursor-pointer
          "
        >
          {dsnaAccs.length > 0 && (
            <optgroup label="DSNA">
              {dsnaAccs.map((acc) => (
                <option key={acc} value={acc}>
                  {acc}
                </option>
              ))}
            </optgroup>
          )}

          {otherAccs.length > 0 && (
            <optgroup label="Autres ACC Européens">
              {otherAccs.map((acc) => (
                <option key={acc} value={acc}>
                  {acc}
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </div>

      {/* Zone droite : dernière mise à jour + toggle thème */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs italic theme-text-muted flex items-center gap-1 whitespace-nowrap">
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Mise à jour : {lastUpdate.toLocaleString('fr-FR')}
        </span>

        {lastCompleteWeekLabel && (
          <span className="text-xs font-semibold border-l pl-3 text-accent-amber theme-border whitespace-nowrap">
            {lastCompleteWeekLabel}
          </span>
        )}

        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
          aria-label={
            theme === 'dark'
              ? 'Passer en mode clair'
              : 'Passer en mode sombre'
          }
          className="
            p-2 rounded-md border transition-colors button-themed
            focus:outline-none focus:ring-2 focus:ring-amber-500
          "
        >
          {theme === 'dark' ? (
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          ) : (
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
              />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
};

export default Header;