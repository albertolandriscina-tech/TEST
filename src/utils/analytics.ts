import { addDays, endOfMonth, format, isAfter, isBefore, parseISO, startOfMonth, subMonths, subYears } from 'date-fns';
import type { Account, Category, PatrimonioAsset, Transaction } from '../types';
import { LIQUIDITY_ACCOUNT_TYPES } from '../types';
import { accountDelta, getCategoryAndDescendantIds, round2, signedBalanceForNetWorth, type InvestmentHolding } from './ledger';
import { MONTH_NAMES_SHORT_IT } from './format';

export interface CashFlowBucket {
  key: string;
  label: string;
  entrate: number;
  uscite: number;
  saldo: number;
}

/**
 * Flusso di cassa reale (principio di cassa, non di competenza): quanto denaro è
 * effettivamente entrato o uscito dai conti di liquidità/conto corrente in un
 * intervallo di date. A differenza del saldo economico (Conto Economico), che segue
 * la competenza per categoria, qui contano tutti i movimenti che intaccano la
 * liquidità disponibile — comprese le entrate/uscite dirette e i trasferimenti da/verso
 * conti non liquidi (es. un versamento sul conto titoli, o il pagamento di una rata
 * di un mutuo): il denaro esce comunque davvero dal conto corrente o dal contante.
 * Un trasferimento tra due conti di liquidità (es. conto corrente → contanti) si
 * compensa invece a zero, perché la liquidità complessiva non cambia.
 */
export function computeCashFlow(transactions: Transaction[], accounts: Account[], from: Date, to: Date): { entrate: number; uscite: number } {
  const liquidityIds = new Set(accounts.filter((a) => LIQUIDITY_ACCOUNT_TYPES.includes(a.type)).map((a) => a.id));
  let entrate = 0;
  let uscite = 0;
  for (const t of transactions) {
    const d = parseISO(t.date);
    if (isBefore(d, from) || isAfter(d, to)) continue;

    let impact = 0;
    if (t.type === 'income') {
      if (liquidityIds.has(t.accountId)) impact = t.amount;
    } else if (t.type === 'expense') {
      if (liquidityIds.has(t.accountId)) impact = -t.amount;
    } else {
      if (liquidityIds.has(t.accountId)) impact -= t.amount;
      if (t.toAccountId && liquidityIds.has(t.toAccountId)) impact += t.amount;
    }

    if (impact > 0) entrate += impact;
    else if (impact < 0) uscite += -impact;
  }
  return { entrate: round2(entrate), uscite: round2(uscite) };
}

/** Flusso di cassa giornaliero tra due date (per l'analisi in dettaglio di un singolo mese). */
export function buildDailyCashFlow(transactions: Transaction[], accounts: Account[], fromISO: string, toISO: string): CashFlowBucket[] {
  const from = parseISO(fromISO);
  const to = parseISO(toISO);
  const buckets: CashFlowBucket[] = [];
  let cursor = from;
  let guard = 0;
  while (!isAfter(cursor, to) && guard < 366) {
    const { entrate, uscite } = computeCashFlow(transactions, accounts, cursor, cursor);
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
export function buildMonthlyCashFlow(transactions: Transaction[], accounts: Account[], count: number, anchor = new Date()): CashFlowBucket[] {
  const buckets: CashFlowBucket[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const m = subMonths(anchor, i);
    const from = startOfMonth(m);
    const to = endOfMonth(m);
    const { entrate, uscite } = computeCashFlow(transactions, accounts, from, to);
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
export function buildYearlyCashFlow(transactions: Transaction[], accounts: Account[], count: number, anchor = new Date()): CashFlowBucket[] {
  const buckets: CashFlowBucket[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const y = subYears(anchor, i);
    const from = new Date(y.getFullYear(), 0, 1);
    const to = new Date(y.getFullYear(), 11, 31, 23, 59, 59);
    const { entrate, uscite } = computeCashFlow(transactions, accounts, from, to);
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
export function buildCustomRangeCashFlow(transactions: Transaction[], accounts: Account[], fromISO: string, toISO: string): CashFlowBucket[] {
  const from = startOfMonth(parseISO(fromISO));
  const to = endOfMonth(parseISO(toISO));
  if (isAfter(from, to)) return [];

  const buckets: CashFlowBucket[] = [];
  let cursor = from;
  let guard = 0;
  while (!isAfter(cursor, to) && guard < 120) {
    const bFrom = startOfMonth(cursor);
    const bTo = endOfMonth(cursor);
    const { entrate, uscite } = computeCashFlow(transactions, accounts, bFrom, bTo);
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
