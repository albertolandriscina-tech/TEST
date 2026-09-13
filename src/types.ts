// ---------- Conti ----------

export type AccountType = 'bank' | 'cash' | 'investment' | 'credit_card' | 'mortgage' | 'other';

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  bank: 'Conto bancario',
  cash: 'Contanti',
  investment: 'Conto titoli / investimenti',
  credit_card: 'Carta di credito',
  mortgage: 'Mutuo',
  other: 'Altro',
};

// I conti di questi tipi sono considerati sempre passività (debiti), indipendentemente
// dal segno del saldo calcolato: un conto "Mutuo", ad esempio, rappresenta sempre un
// debito residuo verso la banca, anche se per errore o per un rimborso il saldo
// risultasse temporaneamente positivo.
export const LIABILITY_ACCOUNT_TYPES: AccountType[] = ['credit_card', 'mortgage'];

// Conti di liquidità immediata ("conti di liquidità o conti correnti"): il flusso di
// cassa è il movimento di denaro che entra o esce realmente da questi conti (principio
// di cassa), a differenza del saldo economico/Conto Economico che segue il principio di
// competenza. Un versamento verso un conto titoli o un pagamento di un mutuo, ad esempio,
// riducono la liquidità disponibile e vanno quindi conteggiati nel flusso di cassa anche
// se non sono "spese" in senso economico.
export const LIQUIDITY_ACCOUNT_TYPES: AccountType[] = ['bank', 'cash'];

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
  icon?: string; // chiave in CATEGORY_ICONS (src/utils/categoryStyle.ts)
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

export type InvestmentRegion =
  | 'italia'
  | 'europa'
  | 'nord_america'
  | 'mercati_emergenti'
  | 'asia_pacifico'
  | 'globale'
  | 'altro';

export const INVESTMENT_REGION_LABELS: Record<InvestmentRegion, string> = {
  italia: 'Italia',
  europa: 'Europa',
  nord_america: 'Nord America',
  mercati_emergenti: 'Mercati emergenti',
  asia_pacifico: 'Asia-Pacifico',
  globale: 'Globale / diversificato',
  altro: 'Altro',
};

export type InvestmentSector =
  | 'tecnologia'
  | 'finanziario'
  | 'sanita'
  | 'energia'
  | 'industriale'
  | 'consumo_discrezionale'
  | 'consumo_base'
  | 'utilities'
  | 'immobiliare'
  | 'materie_prime'
  | 'diversificato'
  | 'altro';

export const INVESTMENT_SECTOR_LABELS: Record<InvestmentSector, string> = {
  tecnologia: 'Tecnologia',
  finanziario: 'Finanziario',
  sanita: 'Sanità',
  energia: 'Energia',
  industriale: 'Industriale',
  consumo_discrezionale: 'Consumo discrezionale',
  consumo_base: 'Consumo di base',
  utilities: 'Utilities',
  immobiliare: 'Immobiliare',
  materie_prime: 'Materie prime',
  diversificato: 'Diversificato / multi-settore',
  altro: 'Altro',
};

export type QuoteSource = 'live' | 'simulated';

export interface Investment {
  id: string;
  name: string;
  ticker?: string;
  type: InvestmentType;
  currentPrice: number;
  note?: string;
  archived?: boolean;
  lastUpdated?: string; // ISO datetime dell'ultimo aggiornamento quotazione (manuale, live o simulato)
  quoteSource?: QuoteSource; // origine dell'ultimo aggiornamento automatico
  region?: InvestmentRegion;
  sector?: InvestmentSector;
  currency?: string; // codice ISO (es. EUR, USD); default EUR se non specificata
}

// ---------- Storico valore di portafoglio (per l'analisi degli investimenti) ----------

export interface PortfolioSnapshot {
  id: string;
  date: string; // ISO yyyy-MM-dd
  totalValue: number;
  totalCost: number;
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

// ---------- Dashboard personalizzabile ----------

export type DashboardWidgetType =
  | 'kpi'
  | 'cashflow'
  | 'networth-trend'
  | 'budget'
  | 'accounts-balance'
  | 'category-breakdown'
  | 'recent-transactions';

export interface DashboardWidgetLayout {
  i: string; // corrisponde a DashboardWidgetType
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
}

// ---------- Impostazioni applicazione ----------

export type AppTheme = 'light' | 'dark' | 'system';

export const APP_THEME_LABELS: Record<AppTheme, string> = {
  light: 'Chiaro',
  dark: 'Scuro',
  system: 'Automatico (sistema)',
};

export type ColorTheme = 'indigo' | 'blue' | 'green' | 'violet' | 'rose' | 'amber';

export const COLOR_THEME_LABELS: Record<ColorTheme, string> = {
  indigo: 'Indaco',
  blue: 'Blu',
  green: 'Verde',
  violet: 'Viola',
  rose: 'Rosa',
  amber: 'Ambra',
};

export type FontFamily = 'system' | 'serif' | 'alt' | 'mono';

export const FONT_FAMILY_LABELS: Record<FontFamily, string> = {
  system: 'Predefinito',
  serif: 'Classico (serif)',
  alt: 'Alternativo',
  mono: 'Monospazio',
};

export interface AppSettings {
  theme: AppTheme;
  colorTheme: ColorTheme;
  fontFamily: FontFamily;
  currency: string; // codice ISO 4217, es. EUR
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  colorTheme: 'indigo',
  fontFamily: 'system',
  currency: 'EUR',
};

export interface CurrencyOption {
  code: string;
  label: string;
  symbol: string;
}

export const CURRENCY_OPTIONS: CurrencyOption[] = [
  { code: 'EUR', label: 'Euro', symbol: '€' },
  { code: 'USD', label: 'Dollaro USA', symbol: '$' },
  { code: 'GBP', label: 'Sterlina britannica', symbol: '£' },
  { code: 'CHF', label: 'Franco svizzero', symbol: 'CHF' },
  { code: 'JPY', label: 'Yen giapponese', symbol: '¥' },
  { code: 'CAD', label: 'Dollaro canadese', symbol: 'CA$' },
  { code: 'AUD', label: 'Dollaro australiano', symbol: 'A$' },
];

// ---------- Voce di ledger (partita doppia) ----------

export interface LedgerEntry {
  id: string;
  transactionId: string;
  date: string;
  dareAccountKey: string; // chiave conto/categoria addebitato (Dare)
  avereAccountKey: string; // chiave conto/categoria accreditato (Avere)
  amount: number;
}
