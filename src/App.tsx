import { useState, useEffect, useMemo } from 'react';
import Header from './components/Header';
import { useDynamicManifest } from './hooks/useDynamicManifest';
import KPIGlobal from './components/KPIGlobal';
import Tabs from './components/Tabs';
import View1 from './components/View1';
import View2 from './components/View2';
import View3 from './components/View3';
import View4 from './components/View4';
import View5 from './components/View5';
import Footer from './components/Footer';
import { getLastCompleteWeek, getWeekData, type AccData } from './utils/dataHelpers';
import { FRENCH_ACC, slugToAcc, accToSlug } from './utils/theme';
import { DATA_URL } from './config';

type DataSource = 'remote' | 'local' | 'loading';
type Theme = 'light' | 'dark';

interface DataWithGeneratedAt {
  [key: string]: AccData | string | undefined;
  generated_at?: string;
}

function App() {
  // ── Mise à jour dynamique du manifest PWA et des balises iOS ──────────────
  // Appelé EN PREMIER, avant tous les autres hooks, pour que le manifest
  // et le titre iOS soient corrigés dès le premier rendu.
  useDynamicManifest();

  const [data, setData] = useState<DataWithGeneratedAt | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<DataSource>('loading');

  // ─── Charge les données depuis jsDelivr avec cache-buster + fallback local ───
  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      try {
        // Cache-buster : timestamp unique pour forcer le navigateur à ignorer son cache.
        // Combiné à la purge jsDelivr côté CI, cela garantit des données fraîches.
        const cacheBuster = `?t=${Date.now()}`;
        const res = await fetch(`${DATA_URL}${cacheBuster}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!cancelled) {
          setData(json);
          setDataSource('remote');
        }
      } catch (err: any) {
        console.warn('Fallback local :', err.message);
        try {
          const fallbackData = (await import('./data/traffic_data.json')).default;
          if (!cancelled) {
            setData(fallbackData as unknown as DataWithGeneratedAt);
            setDataError(err.message);
            setDataSource('local');
          }
        } catch (fallbackErr: any) {
          if (!cancelled) {
            setDataError(`Échec du chargement distant (${err.message}) et local (${fallbackErr.message})`);
            setDataSource('local');
          }
        }
      }
    };

    loadData();
    return () => { cancelled = true; };
  }, []);

  // ─── Routage par pathname (/reims, /brest, ...) avec fallback query ───
  const [selectedAcc, setSelectedAcc] = useState<string>(() => {
    const path = window.location.pathname.replace(/^\/|\/$/g, '');
    const fromPath = slugToAcc(path);
    if (fromPath) return fromPath;

    // Compat avec l'ancien ?acc=REIMS+ACC
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get('acc');
    if (fromQuery) return fromQuery;

    return 'REIMS ACC';
  });

  // ─── Thème : light par défaut ───
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('dashboard-theme') as Theme) || 'light';
  });

  // ─── Tous les hooks doivent être appelés AVANT tout return conditionnel ───

  // Synchronisation URL ↔ ACC sélectionné
  useEffect(() => {
    const slug = accToSlug(selectedAcc);
    const targetPath = `/${slug}`;
    if (window.location.pathname !== targetPath) {
      window.history.replaceState({}, '', targetPath);
    }
  }, [selectedAcc]);

  // Application du thème sur <html>
  useEffect(() => {
    localStorage.setItem('dashboard-theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
  }, [theme]);

  const toggleTheme = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'));

  // Données de l'ACC sélectionné (null si data pas encore chargé)
  const accData: AccData | null = data ? (data[selectedAcc] as AccData) : null;

  // Date de mise à jour (extraite du JSON)
  const lastUpdate = useMemo(() => {
    if (data?.generated_at) return new Date(data.generated_at);
    return new Date();
  }, [data]);

  // Label de la dernière semaine complète
  const lastCompleteWeekLabel = useMemo(() => {
    if (!accData) return '';
    const weekNum = getLastCompleteWeek(accData);
    const weekData = getWeekData(accData, weekNum);
    if (weekData && weekData.dates && weekData.dates.length === 7) {
      const formatDate = (d: string) => {
        const date = new Date(d);
        return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      };
      const start = formatDate(weekData.dates[0]);
      const end = formatDate(weekData.dates[6]);
      return `Semaine ${weekNum} (${start} - ${end})`;
    }
    return `Semaine ${weekNum}`;
  }, [accData]);

  // ─── Returns conditionnels (APRÈS tous les hooks) ───

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg" style={{ color: 'var(--text-secondary)' }}>
          Chargement des données…
        </div>
      </div>
    );
  }

  if (!accData) {
    return (
      <div className="p-6 text-center">
        <p className="mb-2">
          Données non disponibles pour <strong>{selectedAcc}</strong>
        </p>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Utilisez le menu pour sélectionner un autre ACC.
        </p>
      </div>
    );
  }

  const isDsnaAcc = FRENCH_ACC.includes(selectedAcc);

  return (
    <div className="min-h-screen flex flex-col">
      <div className="pt-4 px-6 pb-6 max-w-screen-2xl mx-auto w-full flex-1 flex flex-col">
        <Header
          selectedAcc={selectedAcc}
          setSelectedAcc={setSelectedAcc}
          lastUpdate={lastUpdate}
          accList={Object.keys(data).filter(k => k !== 'generated_at')}
          lastCompleteWeekLabel={lastCompleteWeekLabel}
          theme={theme}
          toggleTheme={toggleTheme}
        />

        {dataSource === 'local' && dataError && (
          <div
            className="theme-card p-3 rounded-lg mb-4 text-sm"
            style={{ color: 'var(--accent-amber)' }}
          >
            ⚠️ Données distantes indisponibles, utilisation des données locales embarquées. ({dataError})
          </div>
        )}

        <KPIGlobal data={accData} />

        <Tabs showDsnaTab={isDsnaAcc}>
          <View1 data={accData} />
          <View2 data={accData} />
          <View3 data={accData} />
          <View4 data={accData} />
          <View5 data={data as Record<string, AccData>} />
        </Tabs>

        <Footer />
      </div>
    </div>
  );
}

export default App;