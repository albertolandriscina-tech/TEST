import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon-16.png', 'favicon-32.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'Finanza Personale',
        short_name: 'Finanza',
        description: 'Gestione di conti, movimenti, budget e investimenti personali.',
        // Percorsi relativi al manifest: funzionano sia se l'app è pubblicata alla
        // radice del dominio sia se lo è in una sottocartella (coerente con base: './').
        start_url: '.',
        scope: '.',
        display: 'standalone',
        orientation: 'portrait-primary',
        background_color: '#f8fafc',
        theme_color: '#0d9488',
        lang: 'it',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precache dei soli asset generati dalla build; le chiamate API (quotazioni,
        // Supabase) restano sempre di rete, i dati dell'app vivono nello store/Supabase.
        globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts-stylesheets' },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  server: {
    host: true,
    port: 5173,
    proxy: {
      // Yahoo Finance non invia gli header CORS: chiamarlo direttamente dal
      // browser fallisce sempre (non solo in sandbox). In sviluppo Vite fa da
      // proxy server-side, così il browser vede solo una richiesta same-origin.
      // In produzione la stessa cosa la fa la funzione serverless api/quote.ts.
      '/api/quote': {
        target: 'https://query1.finance.yahoo.com',
        changeOrigin: true,
        rewrite: (path) => {
          const ticker = new URL(path, 'http://localhost').searchParams.get('ticker') ?? '';
          // Stesso formato accettato da api/quote.ts (usato in produzione): evita di
          // inoltrare a Yahoo richieste con ticker vuoti o palesemente malformati.
          const safeTicker = /^[A-Za-z0-9.\-^=]{1,20}$/.test(ticker) ? ticker : '';
          return `/v8/finance/chart/${encodeURIComponent(safeTicker)}?interval=1d&range=1d`;
        },
      },
    },
  },
});
