// ---------- Conti ----------

export type AccountType = 'bank' | 'cash' | 'investment' | 'credit_card' | 'other';

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  bank: 'Conto bancario',
  cash: 'Contanti',
  investment: 'Conto titoli / investimenti',
  credit_card: 'Carta di credito',
  other: 'Altro',
};

// I conti di tipo "credit_card" sono considerati passività (debiti): un saldo
// positivo rappresenta un debito verso il fornitore della carta.
export const LIABILITY_ACCOUNT_TYPES: AccountType[] = ['credit_card'];

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  initialBalance: number;
  currency: string;
  note?: string;
  archived?: boolean;
  createdAt: string;
}

// ---------- Categorie (con sottocategorie) ----------

export type CategoryKind = 'income' | 'expense';

export interface Category {
  id: string;
  name: string;
  kind: CategoryKind;
  parentId?: string | null;
  color?: string;
  archived?: boolean;
  system?: boolean; // categorie di sistema (es. "Investimenti") non cancellabili
}

// ---------- Movimenti (partita doppia) ----------

export type TransactionType = 'income' | 'expense' | 'transfer';

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  income: 'Entrata',
  expense: 'Uscita',
  transfer: 'Giroconto',
};

export interface Transaction {
  id: string;
  date: string; // ISO yyyy-MM-dd
  description: string;
  amount: number; // sempre positivo: il segno è dedotto automaticamente dal type
  type: TransactionType;
  accountId: string; // conto principale del movimento
  categoryId?: string | null; // obbligatorio per income/expense
  toAccountId?: string | null; // obbligatorio per transfer
  note?: string;
  recurringId?: string | null;
  investmentTxId?: string | null; // se generato da un'operazione di investimento
  createdAt: string;
}

// ---------- Budget ----------

export interface Budget {
  id: string;
  categoryId: string;
  year: number;
  month: number; // 1-12
  amount: number;
}

// ---------- Investimenti ----------

export type InvestmentType = 'etf' | 'fund' | 'stock' | 'bond';

export const INVESTMENT_TYPE_LABELS: Record<InvestmentType, string> = {
  etf: 'ETF',
  fund: 'Fondo',
  stock: 'Azione',
  bond: 'Obbligazione',
};

export interface Investment {
  id: string;
  name: string;
  ticker?: string;
  type: InvestmentType;
  currentPrice: number;
  note?: string;
  archived?: boolean;
}

export type InvestmentOpType = 'buy' | 'sell';

export interface InvestmentTransaction {
  id: string;
  investmentId: string;
  date: string;
  type: InvestmentOpType;
  quantity: number;
  price: number;
  fees: number;
  cashAccountId: string; // conto corrente titoli da cui partono acquisti/vendite
  createdAt: string;
}

// ---------- Patrimonio (beni non finanziari) ----------

export type AssetCategory = 'real_estate' | 'vehicle' | 'other';

export const ASSET_CATEGORY_LABELS: Record<AssetCategory, string> = {
  real_estate: 'Immobile',
  vehicle: 'Auto / veicolo',
  other: 'Altro bene',
};

export interface PatrimonioAsset {
  id: string;
  name: string;
  category: AssetCategory;
  value: number;
  purchaseValue?: number;
  purchaseDate?: string;
  note?: string;
}

// ---------- Movimenti ricorrenti ----------

export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export const RECURRENCE_LABELS: Record<RecurrenceFrequency, string> = {
  daily: 'Giornaliera',
  weekly: 'Settimanale',
  monthly: 'Mensile',
  yearly: 'Annuale',
};

export interface RecurringTransaction {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  accountId: string;
  categoryId?: string | null;
  toAccountId?: string | null;
  frequency: RecurrenceFrequency;
  startDate: string;
  endDate?: string | null;
  lastGeneratedDate?: string | null;
  active: boolean;
  note?: string;
}

// ---------- Voce di ledger (partita doppia) ----------

export interface LedgerEntry {
  id: string;
  transactionId: string;
  date: string;
  dareAccountKey: string; // chiave conto/categoria addebitato (Dare)
  avereAccountKey: string; // chiave conto/categoria accreditato (Avere)
  amount: number;
}
