import React, { useState, useEffect, useMemo } from 'react';
import Header from './components/Header';
import KPIGlobal from './components/KPIGlobal';
import Tabs from './components/Tabs';
import View1 from './components/View1';
import View2 from './components/View2';
import View3 from './components/View3';
import View4 from './components/View4';
import View5 from './components/View5';
import Footer from './components/Footer';
import localData from './data/traffic_data.json';
import { getLastCompleteWeek, getWeekData } from './utils/dataHelpers';
import { FRENCH_ACC, slugToAcc, accToSlug } from './utils/theme';
import { DATA_URL } from './config';

function App() {
  const [data, setData] = useState(null);
  const [dataError, setDataError] = useState(null);
  const [dataSource, setDataSource] = useState('loading'); // 'remote' | 'local' | 'loading'

  // ─── Chargement des données depuis jsDelivr avec fallback local ───
  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      try {
        const res = await fetch(DATA_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!cancelled) {
          setData(json);
          setDataSource('remote');
        }
      } catch (err) {
        console.warn('Échec du chargement distant, fallback local :', err.message);
        if (!cancelled) {
          setData(localData);
          setDataError(err.message);
          setDataSource('local');
        }
      }
    };

    loadData();
    return () => { cancelled = true; };
  }, []);

  // ─── Routage par pathname (/reims, /brest, ...) avec fallback query ───
  const [selectedAcc, setSelectedAcc] = useState(() => {
    const path = window.location.pathname.replace(/^\/|\/$/g, '');
    const fromPath = slugToAcc(path);
    if (fromPath) return fromPath;

    // Compat avec l'ancien ?acc=REIMS+ACC
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get('acc');
    if (fromQuery && localData[fromQuery]) return fromQuery;

    return 'REIMS ACC';
  });

  // Synchronisation URL ↔ ACC sélectionné
  useEffect(() => {
    const slug = accToSlug(selectedAcc);
    const targetPath = `/${slug}`;
    if (window.location.pathname !== targetPath) {
      window.history.replaceState({}, '', targetPath);
    }
  }, [selectedAcc]);

  // ─── Thème : light par défaut ───
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('dashboard-theme') || 'light';
  });

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

  // ─── État de chargement ───
  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse text-lg">Chargement des données…</div>
        </div>
      </div>
    );
  }

  const accData = data[selectedAcc];

  const lastUpdate = useMemo(() => {
    if (data.generated_at) return new Date(data.generated_at);
    return new Date();
  }, [data]);

  const lastCompleteWeekLabel = useMemo(() => {
    if (!accData) return '';
    const weekNum = getLastCompleteWeek(accData);
    const weekData = getWeekData(accData, weekNum);
    if (weekData && weekData.dates && weekData.dates.length === 7) {
      const formatDate = (d) => {
        const date = new Date(d);
        return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      };
      const start = formatDate(weekData.dates[0]);
      const end = formatDate(weekData.dates[6]);
      return `Semaine ${weekNum} (${start} - ${end})`;
    }
    return `Semaine ${weekNum}`;
  }, [accData]);

  if (!accData) {
    return (
      <div className="p-6 text-center">
        <p className="mb-2">Données non disponibles pour <strong>{selectedAcc}</strong></p>
        <p className="text-sm opacity-60">Utilisez le menu pour sélectionner un autre ACC.</p>
      </div>
    );
  }

  const isDsnaAcc = FRENCH_ACC.includes(selectedAcc);

  return (
    <div className="min-h-screen flex flex-col">
      <div className="p-6 max-w-screen-2xl mx-auto w-full flex-1 flex flex-col">
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
          <div className="theme-card p-3 rounded-lg mb-4 text-sm"
            style={{ color: 'var(--accent-amber)' }}>
            ⚠️ Données distantes indisponibles, utilisation des données locales embarquées. ({dataError})
          </div>
        )}

        <KPIGlobal data={accData} />
        <Tabs showDsnaTab={isDsnaAcc}>
          <View1 data={accData} />
          <View2 data={accData} />
          <View3 data={accData} />
          <View4 data={accData} />
          <View5 data={data} />
        </Tabs>
        <Footer />
      </div>
    </div>
  );
}

export default App;