import { addDays, endOfMonth, format, isAfter, isBefore, parseISO, startOfMonth, subMonths, subYears } from 'date-fns';
import type { Account, Category, PatrimonioAsset, Transaction } from '../types';
import { accountDelta, getCategoryAndDescendantIds, signedBalanceForNetWorth, type InvestmentHolding } from './ledger';
import { MONTH_NAMES_SHORT_IT } from './format';

export interface CashFlowBucket {
  key: string;
  label: string;
  entrate: number;
  uscite: number;
  saldo: number;
}

/**
 * Somma i movimenti di un tipo (entrata/uscita) in un intervallo di date, escludendo gli
 * acquisti/vendite di investimenti: sono trasferimenti patrimoniali (il denaro resta
 * all'interno del patrimonio, spostandosi verso gli strumenti finanziari) e non vere
 * entrate/uscite economiche, quindi non devono comparire come tali in report e analisi.
 */
export function sumByType(transactions: Transaction[], type: 'income' | 'expense', from: Date, to: Date): number {
  return transactions
    .filter((t) => t.type === type && !t.investmentTxId)
    .filter((t) => {
      const d = parseISO(t.date);
      return !isBefore(d, from) && !isAfter(d, to);
    })
    .reduce((s, t) => s + t.amount, 0);
}

/** Flusso di cassa giornaliero tra due date (per l'analisi in dettaglio di un singolo mese). */
export function buildDailyCashFlow(transactions: Transaction[], fromISO: string, toISO: string): CashFlowBucket[] {
  const from = parseISO(fromISO);
  const to = parseISO(toISO);
  const buckets: CashFlowBucket[] = [];
  let cursor = from;
  let guard = 0;
  while (!isAfter(cursor, to) && guard < 366) {
    const entrate = sumByType(transactions, 'income', cursor, cursor);
    const uscite = sumByType(transactions, 'expense', cursor, cursor);
    buckets.push({
      key: format(cursor, 'yyyy-MM-dd'),
      label: format(cursor, 'd'),
      entrate,
      uscite,
      saldo: entrate - uscite,
    });
    cursor = addDays(cursor, 1);
    guard++;
  }
  return buckets;
}

export interface CategoryBreakdownChild {
  category: Category;
  amount: number;
  pct: number;
}

export interface CategoryBreakdownItem {
  category: Category;
  amount: number;
  pct: number;
  children: CategoryBreakdownChild[];
}

/**
 * Scomposizione di entrate/uscite per categoria principale (con sottocategorie in
 * dettaglio) in un intervallo di date, ordinata per importo decrescente.
 */
export function buildCategoryBreakdown(
  transactions: Transaction[],
  categories: Category[],
  type: 'income' | 'expense',
  fromISO: string,
  toISO: string
): CategoryBreakdownItem[] {
  const filtered = transactions.filter((t) => t.type === type && !t.investmentTxId && t.date >= fromISO && t.date <= toISO);
  const total = filtered.reduce((s, t) => s + t.amount, 0);

  const roots = categories.filter((c) => c.kind === type && !c.parentId && !c.archived && !c.system);
  return roots
    .map((root) => {
      const ids = getCategoryAndDescendantIds(root.id, categories);
      const amount = filtered
        .filter((t) => t.categoryId && ids.includes(t.categoryId))
        .reduce((s, t) => s + t.amount, 0);
      const children: CategoryBreakdownChild[] = categories
        .filter((c) => c.parentId === root.id && !c.archived)
        .map((child) => {
          const childAmount = filtered
            .filter((t) => t.categoryId === child.id)
            .reduce((s, t) => s + t.amount, 0);
          return { category: child, amount: childAmount, pct: total > 0 ? (childAmount / total) * 100 : 0 };
        })
        .filter((c) => c.amount > 0)
        .sort((a, b) => b.amount - a.amount);
      return { category: root, amount, pct: total > 0 ? (amount / total) * 100 : 0, children };
    })
    .filter((item) => item.amount > 0)
    .sort((a, b) => b.amount - a.amount);
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
      accountsTotal += signedBalanceForNetWorth(acc, bal);
    }
    points.push({
      key: format(m, 'yyyy-MM'),
      label: `${MONTH_NAMES_SHORT_IT[m.getMonth()]} '${format(m, 'yy')}`,
      value: accountsTotal + investimentiValue + patrimonioValue,
    });
  }
  return points;
}
