import { endOfMonth, format, isAfter, isBefore, parseISO, startOfMonth, subMonths, subYears } from 'date-fns';
import type { Account, PatrimonioAsset, Transaction } from '../types';
import { accountDelta, type InvestmentHolding } from './ledger';
import { MONTH_NAMES_SHORT_IT } from './format';

export interface CashFlowBucket {
  key: string;
  label: string;
  entrate: number;
  uscite: number;
  saldo: number;
}

function sumByType(transactions: Transaction[], type: 'income' | 'expense', from: Date, to: Date): number {
  return transactions
    .filter((t) => t.type === type)
    .filter((t) => {
      const d = parseISO(t.date);
      return !isBefore(d, from) && !isAfter(d, to);
    })
    .reduce((s, t) => s + t.amount, 0);
}

/** Flusso di cassa mensile per gli ultimi `count` mesi (incluso il mese corrente). */
export function buildMonthlyCashFlow(transactions: Transaction[], count: number, anchor = new Date()): CashFlowBucket[] {
  const buckets: CashFlowBucket[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const m = subMonths(anchor, i);
    const from = startOfMonth(m);
    const to = endOfMonth(m);
    const entrate = sumByType(transactions, 'income', from, to);
    const uscite = sumByType(transactions, 'expense', from, to);
    buckets.push({
      key: format(m, 'yyyy-MM'),
      label: `${MONTH_NAMES_SHORT_IT[m.getMonth()]} '${format(m, 'yy')}`,
      entrate,
      uscite,
      saldo: entrate - uscite,
    });
  }
  return buckets;
}

/** Flusso di cassa annuale per gli ultimi `count` anni (incluso l'anno corrente). */
export function buildYearlyCashFlow(transactions: Transaction[], count: number, anchor = new Date()): CashFlowBucket[] {
  const buckets: CashFlowBucket[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const y = subYears(anchor, i);
    const from = new Date(y.getFullYear(), 0, 1);
    const to = new Date(y.getFullYear(), 11, 31, 23, 59, 59);
    const entrate = sumByType(transactions, 'income', from, to);
    const uscite = sumByType(transactions, 'expense', from, to);
    buckets.push({
      key: String(y.getFullYear()),
      label: String(y.getFullYear()),
      entrate,
      uscite,
      saldo: entrate - uscite,
    });
  }
  return buckets;
}

/** Flusso di cassa per un intervallo di date personalizzato, con bucket mensili. */
export function buildCustomRangeCashFlow(transactions: Transaction[], fromISO: string, toISO: string): CashFlowBucket[] {
  const from = startOfMonth(parseISO(fromISO));
  const to = endOfMonth(parseISO(toISO));
  if (isAfter(from, to)) return [];

  const buckets: CashFlowBucket[] = [];
  let cursor = from;
  let guard = 0;
  while (!isAfter(cursor, to) && guard < 120) {
    const bFrom = startOfMonth(cursor);
    const bTo = endOfMonth(cursor);
    const entrate = sumByType(transactions, 'income', bFrom, bTo);
    const uscite = sumByType(transactions, 'expense', bFrom, bTo);
    buckets.push({
      key: format(cursor, 'yyyy-MM'),
      label: `${MONTH_NAMES_SHORT_IT[cursor.getMonth()]} '${format(cursor, 'yy')}`,
      entrate,
      uscite,
      saldo: entrate - uscite,
    });
    cursor = subMonths(cursor, -1);
    guard++;
  }
  return buckets;
}

export interface NetWorthPoint {
  key: string;
  label: string;
  value: number;
}

/**
 * Andamento del patrimonio netto negli ultimi `count` mesi. I saldi dei conti sono
 * ricostruiti alla fine di ogni mese dai movimenti storici; il valore di investimenti
 * e beni patrimoniali è quello attuale (non essendo tracciato uno storico dei prezzi),
 * quindi l'andamento riflette soprattutto l'effetto dei flussi di cassa nel tempo.
 */
export function buildNetWorthTrend(
  accounts: Account[],
  transactions: Transaction[],
  holdings: InvestmentHolding[],
  patrimonioAssets: PatrimonioAsset[],
  count: number,
  anchor = new Date()
): NetWorthPoint[] {
  const investimentiValue = holdings.reduce((s, h) => s + h.currentValue, 0);
  const patrimonioValue = patrimonioAssets.reduce((s, a) => s + a.value, 0);

  const points: NetWorthPoint[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const m = subMonths(anchor, i);
    const cutoff = endOfMonth(m);
    let accountsTotal = 0;
    for (const acc of accounts) {
      let bal = acc.initialBalance;
      for (const t of transactions) {
        if (!isAfter(parseISO(t.date), cutoff)) {
          bal += accountDelta(t, acc.id);
        }
      }
      accountsTotal += bal;
    }
    points.push({
      key: format(m, 'yyyy-MM'),
      label: `${MONTH_NAMES_SHORT_IT[m.getMonth()]} '${format(m, 'yy')}`,
      value: accountsTotal + investimentiValue + patrimonioValue,
    });
  }
  return points;
}
