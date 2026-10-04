import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['pwa-icon.svg', '_redirects'],
      manifest: {
        name: 'Eurocontrol - DSNA Performance ACC',
        short_name: 'DSNA ACC',
        description: 'Tableau de bord opérationnel pour le suivi des performances de trafic et délais ATFM des centres de contrôle en-route.',
        theme_color: '#0b1329',
        background_color: '#0b1329',
        display: 'standalone',
        orientation: 'any',
        start_url: './',
        scope: './',
        icons: [
          {
            src: 'pwa-icon.svg',
            sizes: '192x192 512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/gh\/.*\/traffic_data\.json/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'eurocontrol-data-cache',
              expiration: {
                maxEntries: 5,
                maxAgeSeconds: 86400 * 7 // 7 jours
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ],
  base: './', // pour GitLab Pages / SPA
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