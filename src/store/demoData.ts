import { subMonths, format } from 'date-fns';
import type {
  Account,
  Budget,
  Category,
  Investment,
  InvestmentTransaction,
  PatrimonioAsset,
  RecurringTransaction,
  Transaction,
} from '../types';
import { newId } from '../utils/id';
import { buildDefaultCategories, SYSTEM_CATEGORY_INVESTMENT_BUY, SYSTEM_CATEGORY_INVESTMENT_SELL } from './seed';

function iso(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

export interface DemoDataset {
  categories: Category[];
  accounts: Account[];
  transactions: Transaction[];
  budgets: Budget[];
  investments: Investment[];
  investmentTransactions: InvestmentTransaction[];
  patrimonioAssets: PatrimonioAsset[];
  recurringTransactions: RecurringTransaction[];
}

/** Dataset di esempio realistico (12 mesi di storico) per mostrare l'app già popolata. */
export function buildDemoDataset(): DemoDataset {
  const categories = buildDefaultCategories();
  const buyCategory: Category = {
    id: newId(),
    name: SYSTEM_CATEGORY_INVESTMENT_BUY,
    kind: 'expense',
    parentId: null,
    system: true,
    icon: 'trendingup',
    color: '#6366f1',
  };
  const sellCategory: Category = {
    id: newId(),
    name: SYSTEM_CATEGORY_INVESTMENT_SELL,
    kind: 'income',
    parentId: null,
    system: true,
    icon: 'trendingdown',
    color: '#14b8a6',
  };
  categories.push(buyCategory, sellCategory);

  const cat = (name: string) => categories.find((c) => c.name === name)!.id;
  const now = new Date();
  const nowISO = iso(now);

  const contoCorrente: Account = { id: newId(), name: 'Conto Corrente', type: 'bank', initialBalance: 1800, currency: 'EUR', createdAt: nowISO };
  const contanti: Account = { id: newId(), name: 'Contanti', type: 'cash', initialBalance: 120, currency: 'EUR', createdAt: nowISO };
  const contoTitoli: Account = { id: newId(), name: 'Conto Titoli', type: 'investment', initialBalance: 0, currency: 'EUR', createdAt: nowISO };
  const cartaCredito: Account = { id: newId(), name: 'Carta di Credito', type: 'credit_card', initialBalance: 0, currency: 'EUR', createdAt: nowISO };
  const accounts = [contoCorrente, contanti, contoTitoli, cartaCredito];

  const transactions: Transaction[] = [];
  const tx = (partial: Omit<Transaction, 'id' | 'createdAt'>) =>
    transactions.push({ ...partial, id: newId(), createdAt: new Date().toISOString() });

  for (let i = 11; i >= 0; i--) {
    const m = subMonths(now, i);
    const day = (d: number) => iso(new Date(m.getFullYear(), m.getMonth(), d));

    tx({ date: day(27), description: 'Stipendio', amount: i % 3 === 0 ? 2300 : 2150, type: 'income', accountId: contoCorrente.id, categoryId: cat('Stipendio') });
    tx({ date: day(1), description: 'Affitto', amount: 750, type: 'expense', accountId: contoCorrente.id, categoryId: cat('Affitto/Mutuo') });
    tx({ date: day(2), description: 'Prelievo contante', amount: 100, type: 'transfer', accountId: contoCorrente.id, toAccountId: contanti.id });
    tx({ date: day(5), description: 'Bollette luce, gas e acqua', amount: 95 + (i % 4) * 10, type: 'expense', accountId: contoCorrente.id, categoryId: cat('Bollette') });
    tx({ date: day(10), description: 'Spesa supermercato', amount: 140, type: 'expense', accountId: contoCorrente.id, categoryId: cat('Supermercato') });
    tx({ date: day(24), description: 'Spesa supermercato', amount: 128, type: 'expense', accountId: contoCorrente.id, categoryId: cat('Supermercato') });
    tx({ date: day(15), description: 'Cena fuori', amount: 52, type: 'expense', accountId: contanti.id, categoryId: cat('Ristoranti') });
    tx({ date: day(8), description: 'Rifornimento carburante', amount: 65, type: 'expense', accountId: contoCorrente.id, categoryId: cat('Carburante') });
    tx({ date: day(3), description: 'Abbonamento mezzi pubblici', amount: 35, type: 'expense', accountId: contoCorrente.id, categoryId: cat('Mezzi pubblici') });
    tx({ date: day(20), description: 'Cinema e svago', amount: 45, type: 'expense', accountId: contanti.id, categoryId: cat('Svago') });
    if (i % 3 === 0) {
      tx({ date: day(18), description: 'Farmacia', amount: 28, type: 'expense', accountId: contoCorrente.id, categoryId: cat('Salute') });
    }
  }

  tx({ date: iso(subMonths(now, 2)), description: 'Bonus produttività', amount: 400, type: 'income', accountId: contoCorrente.id, categoryId: cat('Altri redditi') });
  tx({ date: iso(subMonths(now, 5)), description: 'Riparazione auto', amount: 220, type: 'expense', accountId: contoCorrente.id, categoryId: cat('Altro') });

  // ---- Investimenti: versamenti periodici + acquisti a rate (PAC) ----
  const investmentTransactions: InvestmentTransaction[] = [];
  const etf: Investment = { id: newId(), name: 'ETF Azionario Globale', ticker: 'SWDA', type: 'etf', currentPrice: 98 };
  const azione: Investment = { id: newId(), name: 'Azione Generali', ticker: 'G.MI', type: 'stock', currentPrice: 33 };
  const investments = [etf, azione];

  const buyOperation = (
    monthsAgo: number,
    investment: Investment,
    quantity: number,
    price: number,
    fees: number,
    transferAmount: number
  ) => {
    const d = iso(subMonths(now, monthsAgo));
    tx({ date: d, description: 'Versamento conto titoli', amount: transferAmount, type: 'transfer', accountId: contoCorrente.id, toAccountId: contoTitoli.id });
    const opId = newId();
    investmentTransactions.push({
      id: opId,
      investmentId: investment.id,
      date: d,
      type: 'buy',
      quantity,
      price,
      fees,
      cashAccountId: contoTitoli.id,
      createdAt: new Date().toISOString(),
    });
    tx({
      date: d,
      description: `Acquisto ${investment.name}`,
      amount: quantity * price + fees,
      type: 'expense',
      accountId: contoTitoli.id,
      categoryId: buyCategory.id,
      investmentTxId: opId,
    });
  };

  buyOperation(9, etf, 5, 88, 2, 500);
  buyOperation(6, etf, 5, 90, 2, 500);
  buyOperation(3, etf, 5, 95, 2, 500);
  buyOperation(1, azione, 10, 35, 2, 400);

  // ---- Patrimonio ----
  const patrimonioAssets: PatrimonioAsset[] = [
    {
      id: newId(),
      name: 'Appartamento',
      category: 'real_estate',
      value: 165000,
      purchaseValue: 150000,
      purchaseDate: iso(subMonths(now, 60)),
    },
    {
      id: newId(),
      name: 'Automobile',
      category: 'vehicle',
      value: 11000,
      purchaseValue: 18000,
      purchaseDate: iso(subMonths(now, 36)),
    },
  ];

  // ---- Budget (mensili, per tutto l'anno corrente) ----
  const budgets: Budget[] = [];
  const year = now.getFullYear();
  const budgetPlan: [string, number][] = [
    ['Casa', 800],
    ['Alimentari', 350],
    ['Trasporti', 120],
    ['Salute', 60],
    ['Svago', 100],
    ['Altro', 50],
  ];
  for (let month = 1; month <= 12; month++) {
    for (const [name, amount] of budgetPlan) {
      budgets.push({ id: newId(), categoryId: cat(name), year, month, amount });
    }
  }

  // ---- Movimenti ricorrenti di esempio ----
  const startOfMonth = iso(new Date(now.getFullYear(), now.getMonth(), 1));
  const recurringTransactions: RecurringTransaction[] = [
    {
      id: newId(),
      description: 'Netflix',
      amount: 15.99,
      type: 'expense',
      accountId: contoCorrente.id,
      categoryId: cat('Svago'),
      toAccountId: null,
      frequency: 'monthly',
      startDate: startOfMonth,
      endDate: null,
      lastGeneratedDate: null,
      active: true,
    },
    {
      id: newId(),
      description: 'Abbonamento palestra',
      amount: 40,
      type: 'expense',
      accountId: contoCorrente.id,
      categoryId: cat('Svago'),
      toAccountId: null,
      frequency: 'monthly',
      startDate: startOfMonth,
      endDate: null,
      lastGeneratedDate: null,
      active: true,
    },
  ];

  return { categories, accounts, transactions, budgets, investments, investmentTransactions, patrimonioAssets, recurringTransactions };
}
