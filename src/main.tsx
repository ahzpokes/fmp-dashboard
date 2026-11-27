import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Appliquer le thème sombre par défaut
document.documentElement.classList.add('dark');

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}