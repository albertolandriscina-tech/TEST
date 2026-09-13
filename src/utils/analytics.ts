import { addDays, endOfMonth, endOfYear, format, isAfter, isBefore, parseISO, startOfMonth, subMonths, subYears } from 'date-fns';
import type { Account, Category, ExpenseNature, PatrimonioAsset, Transaction } from '../types';
import { LIABILITY_ACCOUNT_TYPES, LIQUIDITY_ACCOUNT_TYPES } from '../types';
import {
  computeAccountBalance,
  getCategoryAndDescendantIds,
  getEffectiveCategoryNature,
  round2,
  signedBalanceForNetWorth,
  type InvestmentHolding,
} from './ledger';
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

export interface CashFlowActivityBreakdown {
  operativa: number;
  investimenti: number;
  finanziamenti: number;
}

/**
 * Scompone il flusso di cassa (solo conti liquidi) tra le tre attività di un classico
 * rendiconto finanziario: gestione operativa (entrate/uscite ordinarie), investimenti
 * (versamenti/prelievi da/verso il conto titoli) e finanziamenti e capitale (pagamenti
 * verso conti di debito come mutuo o carta di credito). I trasferimenti tra due conti
 * liquidi (che non alterano la liquidità complessiva) non vengono conteggiati.
 */
export function computeCashFlowByActivity(
  transactions: Transaction[],
  accounts: Account[],
  from: Date,
  to: Date
): CashFlowActivityBreakdown {
  const liquidityIds = new Set(accounts.filter((a) => LIQUIDITY_ACCOUNT_TYPES.includes(a.type)).map((a) => a.id));
  const accountById = new Map(accounts.map((a) => [a.id, a]));
  let operativa = 0;
  let investimenti = 0;
  let finanziamenti = 0;

  for (const t of transactions) {
    const d = parseISO(t.date);
    if (isBefore(d, from) || isAfter(d, to)) continue;

    if (t.type === 'income' || t.type === 'expense') {
      if (!liquidityIds.has(t.accountId)) continue;
      const signed = t.type === 'income' ? t.amount : -t.amount;
      if (t.investmentTxId) investimenti += signed;
      else operativa += signed;
      continue;
    }

    const fromLiquid = liquidityIds.has(t.accountId);
    const toLiquid = t.toAccountId ? liquidityIds.has(t.toAccountId) : false;
    if (fromLiquid === toLiquid) continue; // entrambi liquidi (o nessuno dei due): non cambia la liquidità totale

    const counterpartId = fromLiquid ? t.toAccountId : t.accountId;
    const counterpart = counterpartId ? accountById.get(counterpartId) : undefined;
    const signed = fromLiquid ? -t.amount : t.amount;

    if (counterpart?.type === 'investment') investimenti += signed;
    else if (counterpart && LIABILITY_ACCOUNT_TYPES.includes(counterpart.type)) finanziamenti += signed;
    else operativa += signed;
  }

  return { operativa: round2(operativa), investimenti: round2(investimenti), finanziamenti: round2(finanziamenti) };
}

function bucketEndDate(key: string): Date {
  if (key.length === 4) return endOfYear(new Date(Number(key), 0, 1)); // 'yyyy'
  if (key.length === 7) return endOfMonth(parseISO(`${key}-01`)); // 'yyyy-MM'
  return parseISO(key); // 'yyyy-MM-dd'
}

/**
 * Liquidità cumulata (somma dei saldi dei conti liquidi) alla fine di ciascun bucket di
 * un flusso di cassa, ricostruita da tutti i movimenti storici fino a quella data — non
 * solo quelli nell'intervallo mostrato, per riflettere il saldo reale.
 */
export function buildLiquidityTrend(transactions: Transaction[], accounts: Account[], buckets: CashFlowBucket[]): number[] {
  const liquidAccounts = accounts.filter((a) => LIQUIDITY_ACCOUNT_TYPES.includes(a.type));
  return buckets.map((b) => {
    const cutoffISO = format(bucketEndDate(b.key), 'yyyy-MM-dd');
    return round2(liquidAccounts.reduce((s, a) => s + computeAccountBalance(a, transactions, cutoffISO), 0));
  });
}

export interface NatureBreakdownItem {
  nature: ExpenseNature | 'non_classificata';
  amount: number;
  pct: number;
}

const NATURE_ORDER: (ExpenseNature | 'non_classificata')[] = ['obbligatoria', 'necessaria', 'extra', 'non_classificata'];

/**
 * Scomposizione delle uscite per natura di spesa (obbligatoria/necessaria/extra) in un
 * intervallo di date: aiuta a distinguere le spese "vincolate" da quelle discrezionali.
 * Le uscite la cui categoria non ha una natura impostata (né propria né ereditata dalla
 * categoria principale) confluiscono in "non_classificata".
 */
export function buildNatureBreakdown(
  transactions: Transaction[],
  categories: Category[],
  fromISO: string,
  toISO: string
): NatureBreakdownItem[] {
  const filtered = transactions.filter(
    (t) => t.type === 'expense' && !t.investmentTxId && t.date >= fromISO && t.date <= toISO
  );
  const totals: Record<ExpenseNature | 'non_classificata', number> = {
    obbligatoria: 0,
    necessaria: 0,
    extra: 0,
    non_classificata: 0,
  };
  for (const t of filtered) {
    const nature = getEffectiveCategoryNature(t.categoryId, categories) ?? 'non_classificata';
    totals[nature] += t.amount;
  }
  const total = filtered.reduce((s, t) => s + t.amount, 0);
  return NATURE_ORDER.map((nature) => ({
    nature,
    amount: round2(totals[nature]),
    pct: total > 0 ? (totals[nature] / total) * 100 : 0,
  })).filter((item) => item.amount > 0.004);
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
    const cutoffISO = format(endOfMonth(m), 'yyyy-MM-dd');
    let accountsTotal = 0;
    for (const acc of accounts) {
      const bal = computeAccountBalance(acc, transactions, cutoffISO);
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
