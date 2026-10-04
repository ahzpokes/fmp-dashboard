import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      /*
       * Stratégie d'injection du Service Worker :
       * On utilise "injectManifest" pour garder le contrôle total sur le SW
       * et éviter que vite-plugin-pwa génère et écrase les 5 manifests statiques
       * placés dans public/.
       *
       * Le fichier src/sw.ts est le Service Worker source ; Vite y injectera
       * automatiquement la liste des assets à précacher (precache manifest).
       *
       * Si tu n'as pas encore de src/sw.ts, garde la stratégie "generateSW"
       * ci-dessous et remplace simplement `manifest: false` pour empêcher
       * la génération du manifest automatique.
       */
      strategies: 'generateSW',
      registerType: 'autoUpdate',
      includeAssets: ['pwa-icon.svg', '_redirects'],

      /*
       * manifest: false
       * Désactive la génération automatique d'un manifest unique par vite-plugin-pwa.
       * Les 5 fichiers manifest-<acc>.json dans public/ sont copiés tels quels
       * dans dist/ par Vite (comportement standard pour les fichiers de public/).
       */
      manifest: false,

      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
        /*
         * On exclut les fichiers manifest-*.json du précaching automatique
         * car ils sont servis statiquement et ne doivent pas être versionnés
         * dans le cache du SW (ils seraient mis en cache avec un hash figé).
         */
        globIgnores: ['manifest-*.json'],
        runtimeCaching: [
          {
            // Cache réseau-d'abord pour les données jsDelivr (trafic_data.json)
            urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/gh\/.*\/traffic_data\.json/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'eurocontrol-data-cache',
              expiration: {
                maxEntries: 5,
                maxAgeSeconds: 86400 * 7, // 7 jours
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Cache réseau-d'abord pour les manifests PWA dynamiques
            // Permet l'accès offline tout en récupérant les mises à jour
            urlPattern: /\/manifest-\w+\.json$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'pwa-manifests-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 86400, // 1 jour
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
  base: '/', // Chemins absolus pour que start_url "/brest" fonctionne correctement
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-recharts': ['recharts'],
        },
      },
    },
  },
});