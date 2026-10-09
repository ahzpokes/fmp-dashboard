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
    <svg
      viewBox="70 50 660 660"
      className="radis-logo-inline-svg"
      focusable="false"
    >
      <defs>
        <linearGradient
          id="headerLeafOuterL"
          x1="0%"
          y1="100%"
          x2="100%"
          y2="0%"
        >
          <stop offset="0%" stopColor="#1E5C45" />
          <stop offset="100%" stopColor="#3D8B6E" />
        </linearGradient>

        <linearGradient
          id="headerLeafInnerL"
          x1="0%"
          y1="100%"
          x2="100%"
          y2="0%"
        >
          <stop offset="0%" stopColor="#3D8B6E" />
          <stop offset="100%" stopColor="#6BBF9A" />
        </linearGradient>

        <linearGradient
          id="headerLeafOuterR"
          x1="100%"
          y1="100%"
          x2="0%"
          y2="0%"
        >
          <stop offset="0%" stopColor="#1E5C45" />
          <stop offset="100%" stopColor="#3D8B6E" />
        </linearGradient>

        <linearGradient
          id="headerLeafInnerR"
          x1="100%"
          y1="100%"
          x2="0%"
          y2="0%"
        >
          <stop offset="0%" stopColor="#3D8B6E" />
          <stop offset="100%" stopColor="#6BBF9A" />
        </linearGradient>

        <radialGradient
          id="headerRadishBody"
          cx="40%"
          cy="30%"
          r="70%"
        >
          <stop offset="0%" stopColor="#FF7B5A" />
          <stop offset="50%" stopColor="#F04A2A" />
          <stop offset="100%" stopColor="#D93A20" />
        </radialGradient>
      </defs>

      {/* Ondes radar animées */}
      <g className="radar-live" fill="none" strokeLinecap="round">
        <circle
          className="radar-halo"
          cx="400"
          cy="330"
          r="118"
          strokeWidth="18"
          opacity="0.10"
        >
          <animate
            attributeName="r"
            values="112;126;112"
            dur="5s"
            repeatCount="indefinite"
            calcMode="spline"
            keyTimes="0;0.5;1"
            keySplines="0.42 0 0.58 1;0.42 0 0.58 1"
          />
          <animate
            attributeName="opacity"
            values="0.07;0.16;0.07"
            dur="5s"
            repeatCount="indefinite"
            calcMode="spline"
            keyTimes="0;0.5;1"
            keySplines="0.42 0 0.58 1;0.42 0 0.58 1"
          />
        </circle>

        <circle
          className="radar-wave"
          cx="400"
          cy="330"
          r="118"
          strokeWidth="4"
          opacity="0"
        >
          <animate
            attributeName="r"
            values="112;208;276"
            keyTimes="0;0.55;1"
            dur="4.2s"
            begin="-0.2s"
            repeatCount="indefinite"
            calcMode="spline"
            keySplines="0.16 0.66 0.3 1;0.32 0 0.55 1"
          />
          <animate
            attributeName="opacity"
            values="0;0.40;0"
            keyTimes="0;0.18;1"
            dur="4.2s"
            begin="-0.2s"
            repeatCount="indefinite"
            calcMode="spline"
            keySplines="0.3 0 0.4 1;0.35 0 0.6 1"
          />
          <animate
            attributeName="stroke-width"
            values="4;2.2;1.1"
            keyTimes="0;0.55;1"
            dur="4.2s"
            begin="-0.2s"
            repeatCount="indefinite"
            calcMode="spline"
            keySplines="0.16 0.66 0.3 1;0.32 0 0.55 1"
          />
        </circle>

        <circle
          className="radar-wave"
          cx="400"
          cy="330"
          r="118"
          strokeWidth="3.2"
          opacity="0"
        >
          <animate
            attributeName="r"
            values="112;216;292"
            keyTimes="0;0.55;1"
            dur="4.2s"
            begin="-1.6s"
            repeatCount="indefinite"
            calcMode="spline"
            keySplines="0.16 0.66 0.3 1;0.32 0 0.55 1"
          />
          <animate
            attributeName="opacity"
            values="0;0.28;0"
            keyTimes="0;0.18;1"
            dur="4.2s"
            begin="-1.6s"
            repeatCount="indefinite"
            calcMode="spline"
            keySplines="0.3 0 0.4 1;0.35 0 0.6 1"
          />
          <animate
            attributeName="stroke-width"
            values="3.2;1.8;0.9"
            keyTimes="0;0.55;1"
            dur="4.2s"
            begin="-1.6s"
            repeatCount="indefinite"
            calcMode="spline"
            keySplines="0.16 0.66 0.3 1;0.32 0 0.55 1"
          />
        </circle>

        <circle
          className="radar-wave"
          cx="400"
          cy="330"
          r="118"
          strokeWidth="2.6"
          opacity="0"
        >
          <animate
            attributeName="r"
            values="112;224;308"
            keyTimes="0;0.55;1"
            dur="4.2s"
            begin="-3s"
            repeatCount="indefinite"
            calcMode="spline"
            keySplines="0.16 0.66 0.3 1;0.32 0 0.55 1"
          />
          <animate
            attributeName="opacity"
            values="0;0.18;0"
            keyTimes="0;0.18;1"
            dur="4.2s"
            begin="-3s"
            repeatCount="indefinite"
            calcMode="spline"
            keySplines="0.3 0 0.4 1;0.35 0 0.6 1"
          />
          <animate
            attributeName="stroke-width"
            values="2.6;1.4;0.75"
            keyTimes="0;0.55;1"
            dur="4.2s"
            begin="-3s"
            repeatCount="indefinite"
            calcMode="spline"
            keySplines="0.16 0.66 0.3 1;0.32 0 0.55 1"
          />
        </circle>
      </g>

      {/* Version statique si animations réduites */}
      <g className="radar-static" fill="none" strokeLinecap="round">
        <circle
          className="radar-wave"
          cx="400"
          cy="330"
          r="190"
          strokeWidth="2"
          opacity="0.18"
        />
        <circle
          className="radar-wave"
          cx="400"
          cy="330"
          r="252"
          strokeWidth="1.5"
          opacity="0.10"
        />
      </g>

      {/* Feuilles */}
      <g className="radis-leaves">
        <path
          d="M390,350 C300,290 230,180 250,120 C300,160 360,250 395,345 Z"
          fill="url(#headerLeafOuterL)"
        />
        <path
          d="M395,348 C340,300 280,210 290,150 C330,190 370,260 398,345 Z"
          fill="url(#headerLeafInnerL)"
        />
        <path
          d="M410,350 C500,290 570,180 550,120 C500,160 440,250 405,345 Z"
          fill="url(#headerLeafOuterR)"
        />
        <path
          d="M405,348 C460,300 520,210 510,150 C470,190 430,260 402,345 Z"
          fill="url(#headerLeafInnerR)"
        />
      </g>

      {/* Corps du radis */}
      <path
        className="radis-body"
        d="M295,350 A105,105 0 0,1 505,350 C505,420 455,480 400,520 C345,480 295,420 295,350 Z"
        fill="url(#headerRadishBody)"
      />

      {/* Visage */}
      <g className="radis-face">
        <path
          d="M352,340 Q366,326 380,340"
          fill="none"
          stroke="#2D2D2D"
          strokeWidth="7"
          strokeLinecap="round"
        />
        <path
          d="M420,340 Q434,326 448,340"
          fill="none"
          stroke="#2D2D2D"
          strokeWidth="7"
          strokeLinecap="round"
        />

        <ellipse cx="338" cy="365" rx="14" ry="9" fill="#FF9999" opacity="0.75" />
        <ellipse cx="462" cy="365" rx="14" ry="9" fill="#FF9999" opacity="0.75" />

        <path
          d="M387,380 Q400,393 413,380"
          fill="none"
          stroke="#2D2D2D"
          strokeWidth="6"
          strokeLinecap="round"
        />
      </g>
    </svg>
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

          <h1 className="radis-text text-2xl font-bold tracking-wide text-primary">
            RADIS
          </h1>
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