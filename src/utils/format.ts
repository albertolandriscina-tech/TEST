import { useStore } from '../store/useStore';
import { CURRENCY_OPTIONS } from '../types';

export function formatCurrency(value: number, currency?: string): string {
  const cur = currency ?? useStore.getState().settings.currency;
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: cur,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Formato compatto (es. "12,3K €") per importi grandi in spazi ridotti (widget dashboard).
 * Implementato manualmente (senza Intl notation:"compact") perché il supporto browser
 * all'abbreviazione compatta per locale diverse dall'inglese non è uniforme ovunque.
 */
export function formatCompactCurrency(value: number, currency?: string): string {
  const cur = currency ?? useStore.getState().settings.currency;
  const symbol = CURRENCY_OPTIONS.find((c) => c.code === cur)?.symbol ?? cur;
  const abs = Math.abs(value);

  let scaled = abs;
  let suffix = '';
  if (abs >= 1_000_000_000) {
    scaled = abs / 1_000_000_000;
    suffix = 'Mld';
  } else if (abs >= 1_000_000) {
    scaled = abs / 1_000_000;
    suffix = 'M';
  } else if (abs >= 1_000) {
    scaled = abs / 1_000;
    suffix = 'K';
  }

  const digits = suffix ? 1 : 2;
  const formattedNumber = new Intl.NumberFormat('it-IT', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  }).format(scaled);

  return `${value < 0 ? '-' : ''}${formattedNumber}${suffix} ${symbol}`;
}

export function formatNumber(value: number, digits = 2): string {
  return new Intl.NumberFormat('it-IT', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export function formatDate(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export function formatDateTime(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.toLocaleDateString('it-IT')} ${d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`;
}

export const MONTH_NAMES_IT = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
];

export const MONTH_NAMES_SHORT_IT = [
  'Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic',
];
