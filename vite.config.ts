import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
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
          return `/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`;
        },
      },
    },
  },
});
