/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        income: '#16a34a',
        expense: '#dc2626',
        transfer: '#2563eb',
        // Tema colori dell'app (impostazioni): valori forniti a runtime tramite
        // variabili CSS, così che tutte le varianti generate da Tailwind
        // (hover:, focus:, dark:, opacità /NN, ecc.) seguano il tema scelto.
        primary: {
          50: 'var(--color-primary-50)',
          100: 'var(--color-primary-100)',
          200: 'var(--color-primary-200)',
          400: 'var(--color-primary-400)',
          500: 'var(--color-primary-500)',
          600: 'var(--color-primary-600)',
          700: 'var(--color-primary-700)',
          950: 'var(--color-primary-950)',
        },
      },
      fontFamily: {
        sans: ['var(--app-font)', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
