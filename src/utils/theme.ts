import type { ColorTheme, FontFamily } from '../types';

export interface ColorScale {
  50: string;
  100: string;
  200: string;
  400: string;
  500: string;
  600: string;
  700: string;
  950: string;
}

export const COLOR_THEME_SCALES: Record<ColorTheme, ColorScale> = {
  indigo: { 50: '#eef2ff', 100: '#e0e7ff', 200: '#c7d2fe', 400: '#818cf8', 500: '#6366f1', 600: '#4f46e5', 700: '#4338ca', 950: '#1e1b4b' },
  blue: { 50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 950: '#172554' },
  green: { 50: '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0', 400: '#34d399', 500: '#10b981', 600: '#059669', 700: '#047857', 950: '#022c22' },
  violet: { 50: '#f5f3ff', 100: '#ede9fe', 200: '#ddd6fe', 400: '#a78bfa', 500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9', 950: '#2e1065' },
  rose: { 50: '#fff1f2', 100: '#ffe4e6', 200: '#fecdd3', 400: '#fb7185', 500: '#f43f5e', 600: '#e11d48', 700: '#be123c', 950: '#4c0519' },
  amber: { 50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 400: '#fbbf24', 500: '#f59e0b', 600: '#d97706', 700: '#b45309', 950: '#451a03' },
};

/** Colore "accento" del tema selezionato, usato per i grafici a linea/area principali. */
export function getAccentColor(theme: ColorTheme): string {
  return COLOR_THEME_SCALES[theme][600];
}

export const FONT_STACKS: Record<FontFamily, string> = {
  system: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"`,
  serif: `Georgia, Cambria, "Times New Roman", Times, serif`,
  alt: `Verdana, Geneva, Tahoma, sans-serif`,
  mono: `ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace`,
};

/** Applica tema chiaro/scuro/automatico, tema colori e carattere al documento. */
export function applyAppearance(theme: 'light' | 'dark' | 'system', colorTheme: ColorTheme, fontFamily: FontFamily): void {
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  const isDark = theme === 'dark' || (theme === 'system' && prefersDark);
  document.documentElement.classList.toggle('dark', isDark);
  document.documentElement.setAttribute('data-color-theme', colorTheme);
  document.documentElement.style.setProperty('--app-font', FONT_STACKS[fontFamily]);
}
