import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      /*
       * Stratégie d'injection du Service Worker :
       * On utilise "generateSW" pour laisser vite-plugin-pwa générer le SW.
       * Les 5 manifests statiques placés dans public/ sont servis tels quels.
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
            /*
             * API GraphQL Nhost (endpoint Hasura) : TOUJOURS aller sur le réseau.
             * Aucun cache → les données sont toujours fraîches.
             * Corrige le problème de cache qui bloquait les mises à jour.
             */
            urlPattern: /^https:\/\/.*\.hasura\..*\.nhost\.run\/v1\/graphql/,
            handler: 'NetworkOnly',
          },
          {
            /*
             * API GraphQL Nhost (endpoint alternatif) : même comportement.
             * Ceinture et bretelles si Nhost change d'URL à l'avenir.
             */
            urlPattern: /^https:\/\/.*\.graphql\..*\.nhost\.run\/v1/,
            handler: 'NetworkOnly',
          },
          {
            /*
             * Cache réseau-d'abord pour les manifests PWA dynamiques.
             * Permet l'accès offline tout en récupérant les mises à jour.
             */
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