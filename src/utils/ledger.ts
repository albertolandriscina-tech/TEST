import type {
  Account,
  Category,
  Investment,
  InvestmentTransaction,
  LedgerEntry,
  PatrimonioAsset,
  Transaction,
} from '../types';
import { LIABILITY_ACCOUNT_TYPES } from '../types';

/**
 * Effetto (delta) di un movimento sul saldo di un determinato conto.
 * Questo è il cuore del riconoscimento automatico Dare/Avere: l'utente
 * inserisce sempre un importo positivo e sceglie solo il "tipo" (entrata,
 * uscita, giroconto); il segno applicato al saldo del conto è dedotto qui.
 */
export function accountDelta(tx: Transaction, accountId: string): number {
  if (tx.type === 'income') {
    return tx.accountId === accountId ? tx.amount : 0;
  }
  if (tx.type === 'expense') {
    return tx.accountId === accountId ? -tx.amount : 0;
  }
  // transfer
  let delta = 0;
  if (tx.accountId === accountId) delta -= tx.amount; // esce dal conto di origine (Avere)
  if (tx.toAccountId === accountId) delta += tx.amount; // entra nel conto di destinazione (Dare)
  return delta;
}

export function computeAccountBalance(account: Account, transactions: Transaction[]): number {
  let balance = account.initialBalance;
  for (const tx of transactions) {
    balance += accountDelta(tx, account.id);
  }
  return balance;
}

/**
 * Saldo di un conto ai fini del calcolo del patrimonio netto: per i conti sempre-passività
 * (es. Mutuo, Carta di credito) il contributo è sempre negativo (debito), indipendentemente
 * dal segno del saldo calcolato dai movimenti.
 */
export function signedBalanceForNetWorth(account: Account, balance: number): number {
  return LIABILITY_ACCOUNT_TYPES.includes(account.type) ? -Math.abs(balance) : balance;
}

export function computeAllAccountBalances(
  accounts: Account[],
  transactions: Transaction[]
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const acc of accounts) {
    result[acc.id] = computeAccountBalance(acc, transactions);
  }
  return result;
}

/** Restituisce l'id della categoria e di tutti i suoi antenati (per aggregare le sottocategorie). */
export function getCategoryAndDescendantIds(categoryId: string, categories: Category[]): string[] {
  const ids = [categoryId];
  const children = categories.filter((c) => c.parentId === categoryId);
  for (const child of children) {
    ids.push(...getCategoryAndDescendantIds(child.id, categories));
  }
  return ids;
}

export function getCategoryPath(categoryId: string | null | undefined, categories: Category[]): string {
  if (!categoryId) return '—';
  const cat = categories.find((c) => c.id === categoryId);
  if (!cat) return '—';
  if (cat.parentId) {
    const parent = categories.find((c) => c.id === cat.parentId);
    if (parent) return `${parent.name} › ${cat.name}`;
  }
  return cat.name;
}

/** Genera le righe di ledger (Dare/Avere) per un movimento, secondo i principi di partita doppia. */
export function transactionToLedgerEntries(
  tx: Transaction,
  categories: Category[]
): LedgerEntry[] {
  const categoryLabel = (id?: string | null) => {
    const cat = categories.find((c) => c.id === id);
    return cat ? `Categoria:${cat.name}` : 'Categoria:Non specificata';
  };

  if (tx.type === 'income') {
    return [
      {
        id: `${tx.id}-1`,
        transactionId: tx.id,
        date: tx.date,
        dareAccountKey: `Conto:${tx.accountId}`,
        avereAccountKey: categoryLabel(tx.categoryId),
        amount: tx.amount,
      },
    ];
  }
  if (tx.type === 'expense') {
    return [
      {
        id: `${tx.id}-1`,
        transactionId: tx.id,
        date: tx.date,
        dareAccountKey: categoryLabel(tx.categoryId),
        avereAccountKey: `Conto:${tx.accountId}`,
        amount: tx.amount,
      },
    ];
  }
  // transfer
  return [
    {
      id: `${tx.id}-1`,
      transactionId: tx.id,
      date: tx.date,
      dareAccountKey: `Conto:${tx.toAccountId}`,
      avereAccountKey: `Conto:${tx.accountId}`,
      amount: tx.amount,
    },
  ];
}

export function buildLedger(transactions: Transaction[], categories: Category[]): LedgerEntry[] {
  return transactions.flatMap((tx) => transactionToLedgerEntries(tx, categories));
}

export interface QuadraturaResult {
  totaleDare: number;
  totaleAvere: number;
  differenza: number;
  quadra: boolean;
  metodoPerConto: number;
  metodoPerFlussi: number;
  differenzaMetodi: number;
  quadraMetodi: boolean;
}

/**
 * Controllo di quadratura: verifica che la somma Dare === somma Avere
 * (integrità della partita doppia) e che il totale dei saldi calcolato
 * "per conto" coincida con quello calcolato "per flussi aggregati"
 * (saldi iniziali + entrate - uscite, dato che i giroconti si annullano
 * a vicenda sul totale). Se qualcosa non coincide (es. un movimento
 * orfano che referenzia un conto cancellato) il controllo lo segnala.
 */
export function computeQuadratura(
  accounts: Account[],
  transactions: Transaction[],
  categories: Category[]
): QuadraturaResult {
  const ledger = buildLedger(transactions, categories);
  const totaleDare = round2(ledger.reduce((s, e) => s + e.amount, 0));
  const totaleAvere = totaleDare; // per costruzione ogni riga ha stesso importo dare/avere
  const differenza = round2(totaleDare - totaleAvere);

  const balances = computeAllAccountBalances(accounts, transactions);
  const metodoPerConto = round2(Object.values(balances).reduce((s, v) => s + v, 0));

  const validAccountIds = new Set(accounts.map((a) => a.id));
  let entrate = 0;
  let uscite = 0;
  const sommaSaldiIniziali = round2(accounts.reduce((s, a) => s + a.initialBalance, 0));
  for (const tx of transactions) {
    if (tx.type === 'income' && validAccountIds.has(tx.accountId)) entrate += tx.amount;
    if (tx.type === 'expense' && validAccountIds.has(tx.accountId)) uscite += tx.amount;
    // i transfer non alterano il totale aggregato (si compensano tra i due conti)
  }
  const metodoPerFlussi = round2(sommaSaldiIniziali + entrate - uscite);
  const differenzaMetodi = round2(metodoPerConto - metodoPerFlussi);

  return {
    totaleDare,
    totaleAvere,
    differenza,
    quadra: Math.abs(differenza) < 0.005,
    metodoPerConto,
    metodoPerFlussi,
    differenzaMetodi,
    quadraMetodi: Math.abs(differenzaMetodi) < 0.005,
  };
}

// ---------- Investimenti ----------

export interface InvestmentHolding {
  investment: Investment;
  quantity: number;
  costBasis: number; // totale investito (al netto delle vendite, a costo medio)
  averagePrice: number;
  currentValue: number;
  gainLoss: number;
  gainLossPct: number;
}

export function computeInvestmentHolding(
  investment: Investment,
  txs: InvestmentTransaction[]
): InvestmentHolding {
  const ops = txs
    .filter((t) => t.investmentId === investment.id)
    .sort((a, b) => a.date.localeCompare(b.date));

  let quantity = 0;
  let costBasis = 0;
  for (const op of ops) {
    if (op.type === 'buy') {
      quantity += op.quantity;
      costBasis += op.quantity * op.price + op.fees;
    } else {
      const avgPriceBefore = quantity > 0 ? costBasis / quantity : 0;
      quantity -= op.quantity;
      costBasis -= avgPriceBefore * op.quantity;
      if (quantity <= 0.0000001) {
        quantity = Math.max(quantity, 0);
        costBasis = Math.max(costBasis, 0);
      }
    }
  }

  const currentValue = quantity * investment.currentPrice;
  const gainLoss = currentValue - costBasis;
  const gainLossPct = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0;
  const averagePrice = quantity > 0 ? costBasis / quantity : 0;

  return { investment, quantity, costBasis, averagePrice, currentValue, gainLoss, gainLossPct };
}

export function computeAllHoldings(
  investments: Investment[],
  txs: InvestmentTransaction[]
): InvestmentHolding[] {
  return investments.map((inv) => computeInvestmentHolding(inv, txs));
}

// ---------- Patrimonio netto complessivo ----------

export interface NetWorthBreakdown {
  liquidita: number; // conti bank/cash/investment/other con saldo positivo
  debiti: number; // valore assoluto dei saldi negativi (es. carte di credito)
  investimenti: number; // valore corrente holding
  patrimonioImmobiliare: number; // somma beni patrimoniali (auto, immobili, altro)
  patrimonioNetto: number;
}

export function computeNetWorth(
  accounts: Account[],
  transactions: Transaction[],
  holdings: InvestmentHolding[],
  assets: PatrimonioAsset[]
): NetWorthBreakdown {
  const balances = computeAllAccountBalances(accounts, transactions);
  let liquidita = 0;
  let debiti = 0;
  for (const acc of accounts) {
    const bal = balances[acc.id] ?? 0;
    if (LIABILITY_ACCOUNT_TYPES.includes(acc.type)) {
      // Conti come "Mutuo" o "Carta di credito" sono sempre una passività,
      // indipendentemente dal segno del saldo calcolato.
      debiti += Math.abs(bal);
    } else if (bal >= 0) {
      liquidita += bal;
    } else {
      debiti += Math.abs(bal);
    }
  }
  const investimenti = holdings.reduce((s, h) => s + h.currentValue, 0);
  const patrimonioImmobiliare = assets.reduce((s, a) => s + a.value, 0);
  const patrimonioNetto = round2(liquidita - debiti + investimenti + patrimonioImmobiliare);

  return {
    liquidita: round2(liquidita),
    debiti: round2(debiti),
    investimenti: round2(investimenti),
    patrimonioImmobiliare: round2(patrimonioImmobiliare),
    patrimonioNetto,
  };
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// ---------- Conto Economico ----------

export interface IncomeStatementLine {
  category: Category;
  amount: number;
}

export interface IncomeStatement {
  year: number;
  ricavi: IncomeStatementLine[];
  costi: IncomeStatementLine[];
  totaleRicavi: number;
  totaleCosti: number;
  risultato: number; // positivo = utile, negativo = perdita
}

/**
 * Conto Economico dell'esercizio: ricavi e costi (per categoria principale, esclusi i
 * movimenti di sistema legati agli investimenti, che sono trasferimenti patrimoniali e
 * non componenti di reddito) con il risultato d'esercizio (utile/perdita), secondo la
 * logica delle sezioni contrapposte Dare (Costi) / Avere (Ricavi) della partita doppia.
 */
export function computeIncomeStatement(transactions: Transaction[], categories: Category[], year: number): IncomeStatement {
  const buildLines = (kind: Category['kind'], type: Transaction['type']): IncomeStatementLine[] => {
    const roots = categories.filter((c) => c.kind === kind && !c.parentId && !c.archived && !c.system);
    return roots
      .map((category) => {
        const ids = getCategoryAndDescendantIds(category.id, categories);
        const amount = transactions
          .filter((t) => t.type === type && t.categoryId && ids.includes(t.categoryId) && t.date.startsWith(String(year)))
          .reduce((s, t) => s + t.amount, 0);
        return { category, amount };
      })
      .filter((line) => line.amount > 0)
      .sort((a, b) => b.amount - a.amount);
  };

  const ricavi = buildLines('income', 'income');
  const costi = buildLines('expense', 'expense');
  const totaleRicavi = round2(ricavi.reduce((s, l) => s + l.amount, 0));
  const totaleCosti = round2(costi.reduce((s, l) => s + l.amount, 0));

  return {
    year,
    ricavi,
    costi,
    totaleRicavi,
    totaleCosti,
    risultato: round2(totaleRicavi - totaleCosti),
  };
}
