import { create } from 'zustand';
import type {
  Account,
  AppSettings,
  Budget,
  Category,
  CategorizationRule,
  DashboardWidgetLayout,
  DashboardWidgetType,
  Investment,
  InvestmentTransaction,
  PatrimonioAsset,
  PortfolioSnapshot,
  RecurringTransaction,
  Transaction,
} from '../types';
import { DEFAULT_SETTINGS } from '../types';
import { newId, todayISO } from '../utils/id';
import {
  buildDefaultCategories,
  SYSTEM_CATEGORY_INVESTMENT_BUY,
  SYSTEM_CATEGORY_INVESTMENT_SELL,
  SYSTEM_CATEGORY_INVESTMENT_FEES,
} from './seed';
import { buildDemoDataset } from './demoData';
import { buildDefaultLayout } from '../dashboardWidgets';
import { computeDueOccurrences, generateTransactionsForRule } from '../utils/recurring';
import { computeAllHoldings, round2 } from '../utils/ledger';
import { findMatchingRule } from '../utils/rules';
import { simulateNewPrice } from '../utils/priceSimulation';
import { fetchYahooQuote } from '../utils/marketData';

// Campi modificabili in blocco su più movimenti selezionati: solo i campi presenti
// vengono applicati (undefined = "non toccare"). categoryId viene ignorato sui
// giroconti, che non hanno categoria.
export interface BulkTransactionChanges {
  accountId?: string;
  categoryId?: string | null;
  date?: string;
  note?: string;
}

interface State {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  investments: Investment[];
  investmentTransactions: InvestmentTransaction[];
  patrimonioAssets: PatrimonioAsset[];
  recurringTransactions: RecurringTransaction[];
  portfolioSnapshots: PortfolioSnapshot[];
  categorizationRules: CategorizationRule[];
  selectedTransactionIds: string[];
  dashboardLayout: DashboardWidgetLayout[];
  hiddenDashboardWidgets: DashboardWidgetType[];
  settings: AppSettings;

  // Conti
  addAccount: (a: Omit<Account, 'id' | 'createdAt'>) => string;
  updateAccount: (id: string, patch: Partial<Account>) => void;
  deleteAccount: (id: string) => void;

  // Categorie
  addCategory: (c: Omit<Category, 'id'>) => string;
  updateCategory: (id: string, patch: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  /** Scambia la categoria con il fratello adiacente (stesso kind e stesso genitore) per riordinarla. */
  moveCategory: (id: string, direction: 'up' | 'down') => void;

  // Movimenti
  addTransaction: (t: Omit<Transaction, 'id' | 'createdAt'>) => void;
  addTransactions: (list: Omit<Transaction, 'id' | 'createdAt'>[]) => void;
  updateTransaction: (id: string, patch: Partial<Transaction>) => void;
  updateTransactions: (ids: string[], changes: BulkTransactionChanges) => void;
  deleteTransaction: (id: string) => void;
  deleteTransactions: (ids: string[]) => void;
  toggleSelectTransaction: (id: string) => void;
  selectAllTransactions: (ids: string[]) => void;
  clearSelection: () => void;

  // Budget
  setBudget: (categoryId: string, year: number, month: number, amount: number) => void;
  deleteBudget: (id: string) => void;

  // Investimenti
  addInvestment: (i: Omit<Investment, 'id'>) => void;
  updateInvestment: (id: string, patch: Partial<Investment>) => void;
  deleteInvestment: (id: string) => void;
  addInvestmentTransaction: (op: Omit<InvestmentTransaction, 'id' | 'createdAt'>) => void;
  deleteInvestmentTransaction: (id: string) => void;
  refreshInvestmentPrices: () => Promise<void>;

  // Patrimonio
  addAsset: (a: Omit<PatrimonioAsset, 'id'>) => void;
  updateAsset: (id: string, patch: Partial<PatrimonioAsset>) => void;
  deleteAsset: (id: string) => void;

  // Ricorrenti
  addRecurring: (r: Omit<RecurringTransaction, 'id'>) => void;
  updateRecurring: (id: string, patch: Partial<RecurringTransaction>) => void;
  deleteRecurring: (id: string) => void;
  generateDueRecurring: () => number;

  ensureSystemCategories: () => { buyId: string; sellId: string; feesId: string };
  resetAllData: () => void;
  loadDemoData: () => void;

  // Regole automatiche di categorizzazione
  addCategorizationRule: (r: Omit<CategorizationRule, 'id' | 'createdAt'>) => string;
  updateCategorizationRule: (id: string, patch: Partial<CategorizationRule>) => void;
  deleteCategorizationRule: (id: string) => void;
  /** Scambia la regola con quella adiacente per riordinare la priorità di applicazione. */
  moveCategorizationRule: (id: string, direction: 'up' | 'down') => void;
  /** Applica le regole attive a tutti i movimenti (entrata/uscita, non frazionati) privi di
   * categoria, nell'ordine delle regole. Restituisce il numero di movimenti aggiornati. */
  applyRulesToUncategorized: () => number;

  // Dashboard personalizzabile
  setDashboardLayout: (layout: DashboardWidgetLayout[]) => void;
  hideDashboardWidget: (type: DashboardWidgetType) => void;
  showDashboardWidget: (type: DashboardWidgetType) => void;
  resetDashboardLayout: () => void;

  // Impostazioni
  updateSettings: (patch: Partial<AppSettings>) => void;
}

// I dati non vengono più inizializzati con il set di esempio né persistiti in
// localStorage: ogni account ha i propri dati salvati su Supabase (vedi
// hooks/useCloudSync.ts), che li carica dopo l'autenticazione. Un account
// nuovo di zecca viene popolato con i dati di esempio dal hook di sincronizzazione,
// non da qui.
export const useStore = create<State>()(
  (set, get) => ({
      accounts: [],
      categories: buildDefaultCategories(),
      transactions: [],
      budgets: [],
      investments: [],
      investmentTransactions: [],
      patrimonioAssets: [],
      recurringTransactions: [],
      portfolioSnapshots: [],
      categorizationRules: [],
      selectedTransactionIds: [],
      dashboardLayout: buildDefaultLayout(),
      hiddenDashboardWidgets: [],
      settings: DEFAULT_SETTINGS,

      addAccount: (a) => {
        const id = newId();
        set((s) => ({
          accounts: [...s.accounts, { ...a, id, createdAt: new Date().toISOString() }],
        }));
        return id;
      },
      updateAccount: (id, patch) =>
        set((s) => ({ accounts: s.accounts.map((a) => (a.id === id ? { ...a, ...patch } : a)) })),
      deleteAccount: (id) =>
        set((s) => ({
          accounts: s.accounts.filter((a) => a.id !== id),
          transactions: s.transactions.filter((t) => t.accountId !== id && t.toAccountId !== id),
          categorizationRules: s.categorizationRules.map((r) => (r.accountId === id ? { ...r, accountId: null } : r)),
        })),

      addCategory: (c) => {
        const id = newId();
        set((s) => ({ categories: [...s.categories, { ...c, id }] }));
        return id;
      },
      updateCategory: (id, patch) =>
        set((s) => ({ categories: s.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
      deleteCategory: (id) =>
        set((s) => ({
          categories: s.categories.filter((c) => c.id !== id && c.parentId !== id),
          transactions: s.transactions.map((t) => ({
            ...t,
            categoryId: t.categoryId === id ? null : t.categoryId,
            splits: t.splits ? t.splits.map((sp) => (sp.categoryId === id ? { ...sp, categoryId: null } : sp)) : t.splits,
          })),
          budgets: s.budgets.filter((b) => b.categoryId !== id),
          // Una regola senza categoria non ha senso: le regole che assegnavano la
          // categoria eliminata vengono rimosse insieme ad essa.
          categorizationRules: s.categorizationRules.filter((r) => r.categoryId !== id),
        })),
      moveCategory: (id, direction) =>
        set((s) => {
          const cat = s.categories.find((c) => c.id === id);
          if (!cat) return {};
          const siblingIds = s.categories
            .filter((c) => c.kind === cat.kind && c.parentId === cat.parentId)
            .map((c) => c.id);
          const idx = siblingIds.indexOf(id);
          const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
          if (swapIdx < 0 || swapIdx >= siblingIds.length) return {};
          const otherId = siblingIds[swapIdx];
          const posA = s.categories.findIndex((c) => c.id === id);
          const posB = s.categories.findIndex((c) => c.id === otherId);
          const next = [...s.categories];
          [next[posA], next[posB]] = [next[posB], next[posA]];
          return { categories: next };
        }),

      addCategorizationRule: (r) => {
        const id = newId();
        set((s) => ({
          categorizationRules: [...s.categorizationRules, { ...r, id, createdAt: new Date().toISOString() }],
        }));
        return id;
      },
      updateCategorizationRule: (id, patch) =>
        set((s) => ({
          categorizationRules: s.categorizationRules.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        })),
      deleteCategorizationRule: (id) =>
        set((s) => ({ categorizationRules: s.categorizationRules.filter((r) => r.id !== id) })),
      moveCategorizationRule: (id, direction) =>
        set((s) => {
          const idx = s.categorizationRules.findIndex((r) => r.id === id);
          if (idx < 0) return {};
          const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
          if (swapIdx < 0 || swapIdx >= s.categorizationRules.length) return {};
          const next = [...s.categorizationRules];
          [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
          return { categorizationRules: next };
        }),
      applyRulesToUncategorized: () => {
        const s = get();
        let count = 0;
        const transactions = s.transactions.map((t) => {
          if (t.type === 'transfer' || t.categoryId || (t.splits && t.splits.length > 0)) return t;
          const rule = findMatchingRule(s.categorizationRules, {
            description: t.description,
            type: t.type,
            accountId: t.accountId,
          });
          if (!rule) return t;
          count += 1;
          return { ...t, categoryId: rule.categoryId };
        });
        if (count > 0) set({ transactions });
        return count;
      },

      addTransaction: (t) =>
        set((s) => ({
          transactions: [
            ...s.transactions,
            { ...t, id: newId(), createdAt: new Date().toISOString() },
          ],
        })),
      addTransactions: (list) =>
        set((s) => ({
          transactions: [
            ...s.transactions,
            ...list.map((t) => ({ ...t, id: newId(), createdAt: new Date().toISOString() })),
          ],
        })),
      updateTransaction: (id, patch) =>
        set((s) => ({
          transactions: s.transactions.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        })),
      updateTransactions: (ids, changes) =>
        set((s) => ({
          transactions: s.transactions.map((t) => {
            if (!ids.includes(t.id)) return t;
            const patch: Partial<Transaction> = {};
            if (changes.accountId !== undefined) patch.accountId = changes.accountId;
            if (changes.categoryId !== undefined && t.type !== 'transfer') patch.categoryId = changes.categoryId;
            if (changes.date !== undefined) patch.date = changes.date;
            if (changes.note !== undefined) patch.note = changes.note;
            return { ...t, ...patch };
          }),
        })),
      deleteTransaction: (id) =>
        set((s) => ({
          transactions: s.transactions.filter((t) => t.id !== id),
          selectedTransactionIds: s.selectedTransactionIds.filter((sid) => sid !== id),
        })),
      deleteTransactions: (ids) =>
        set((s) => ({
          transactions: s.transactions.filter((t) => !ids.includes(t.id)),
          selectedTransactionIds: s.selectedTransactionIds.filter((sid) => !ids.includes(sid)),
        })),
      toggleSelectTransaction: (id) =>
        set((s) => ({
          selectedTransactionIds: s.selectedTransactionIds.includes(id)
            ? s.selectedTransactionIds.filter((x) => x !== id)
            : [...s.selectedTransactionIds, id],
        })),
      selectAllTransactions: (ids) => set({ selectedTransactionIds: ids }),
      clearSelection: () => set({ selectedTransactionIds: [] }),

      setBudget: (categoryId, year, month, amount) =>
        set((s) => {
          const existing = s.budgets.find(
            (b) => b.categoryId === categoryId && b.year === year && b.month === month
          );
          if (existing) {
            return {
              budgets: s.budgets.map((b) => (b.id === existing.id ? { ...b, amount } : b)),
            };
          }
          return {
            budgets: [...s.budgets, { id: newId(), categoryId, year, month, amount }],
          };
        }),
      deleteBudget: (id) => set((s) => ({ budgets: s.budgets.filter((b) => b.id !== id) })),

      addInvestment: (i) => set((s) => ({ investments: [...s.investments, { ...i, id: newId() }] })),
      updateInvestment: (id, patch) =>
        set((s) => ({
          investments: s.investments.map((i) => (i.id === id ? { ...i, ...patch } : i)),
        })),
      deleteInvestment: (id) =>
        set((s) => {
          const relatedTxIds = s.investmentTransactions
            .filter((it) => it.investmentId === id)
            .map((it) => it.id);
          return {
            investments: s.investments.filter((i) => i.id !== id),
            investmentTransactions: s.investmentTransactions.filter((it) => it.investmentId !== id),
            transactions: s.transactions.filter(
              (t) => !t.investmentTxId || !relatedTxIds.includes(t.investmentTxId)
            ),
          };
        }),

      ensureSystemCategories: () => {
        const s = get();
        let buy = s.categories.find((c) => c.system && c.name === SYSTEM_CATEGORY_INVESTMENT_BUY);
        let sell = s.categories.find((c) => c.system && c.name === SYSTEM_CATEGORY_INVESTMENT_SELL);
        let fees = s.categories.find((c) => c.system && c.name === SYSTEM_CATEGORY_INVESTMENT_FEES);
        const toAdd: Category[] = [];
        if (!buy) {
          buy = {
            id: newId(),
            name: SYSTEM_CATEGORY_INVESTMENT_BUY,
            kind: 'expense',
            parentId: null,
            system: true,
            icon: 'trendingup',
            color: '#6366f1',
          };
          toAdd.push(buy);
        }
        if (!sell) {
          sell = {
            id: newId(),
            name: SYSTEM_CATEGORY_INVESTMENT_SELL,
            kind: 'income',
            parentId: null,
            system: true,
            icon: 'trendingdown',
            color: '#14b8a6',
          };
          toAdd.push(sell);
        }
        if (!fees) {
          fees = {
            id: newId(),
            name: SYSTEM_CATEGORY_INVESTMENT_FEES,
            kind: 'expense',
            parentId: null,
            system: true,
            icon: 'creditcard',
            color: '#f97316',
          };
          toAdd.push(fees);
        }
        if (toAdd.length) {
          set((st) => ({ categories: [...st.categories, ...toAdd] }));
        }
        return { buyId: buy.id, sellId: sell.id, feesId: fees.id };
      },

      addInvestmentTransaction: (op) => {
        const { buyId, sellId, feesId } = get().ensureSystemCategories();
        const id = newId();
        const investment = get().investments.find((i) => i.id === op.investmentId);
        const gross = op.quantity * op.price;
        const label = op.type === 'buy' ? 'Acquisto' : 'Vendita';

        const linkedTx: Transaction = {
          id: newId(),
          date: op.date,
          description: `${label} ${investment?.name ?? ''}`.trim(),
          amount: gross,
          type: op.type === 'buy' ? 'expense' : 'income',
          accountId: op.cashAccountId,
          categoryId: op.type === 'buy' ? buyId : sellId,
          toAccountId: null,
          investmentTxId: id,
          createdAt: new Date().toISOString(),
        };

        const newTransactions: Transaction[] = [linkedTx];
        if (op.fees > 0) {
          newTransactions.push({
            id: newId(),
            date: op.date,
            description: `Commissioni ${label.toLowerCase()} ${investment?.name ?? ''}`.trim(),
            amount: op.fees,
            type: 'expense',
            accountId: op.cashAccountId,
            categoryId: feesId,
            toAccountId: null,
            investmentTxId: id,
            createdAt: new Date().toISOString(),
          });
        }

        set((s) => ({
          investmentTransactions: [...s.investmentTransactions, { ...op, id, createdAt: new Date().toISOString() }],
          transactions: [...s.transactions, ...newTransactions],
        }));
      },
      deleteInvestmentTransaction: (id) =>
        set((s) => ({
          investmentTransactions: s.investmentTransactions.filter((it) => it.id !== id),
          transactions: s.transactions.filter((t) => t.investmentTxId !== id),
        })),

      refreshInvestmentPrices: async () => {
        const active = get().investments.filter((i) => !i.archived);
        const now = new Date().toISOString();

        const updates = await Promise.all(
          active.map(async (inv) => {
            const live = inv.ticker ? await fetchYahooQuote(inv.ticker) : null;
            if (live) {
              return {
                id: inv.id,
                currentPrice: live.price,
                lastUpdated: now,
                quoteSource: 'live' as const,
                currency: live.currency ?? inv.currency,
              };
            }
            return {
              id: inv.id,
              currentPrice: simulateNewPrice(inv),
              lastUpdated: now,
              quoteSource: 'simulated' as const,
            };
          })
        );

        set((s) => {
          const updatedMap = new Map(updates.map((u) => [u.id, u]));
          const investments = s.investments.map((i) => {
            const u = updatedMap.get(i.id);
            return u ? { ...i, ...u } : i;
          });

          const holdings = computeAllHoldings(
            investments.filter((i) => !i.archived),
            s.investmentTransactions
          );
          const totalValue = round2(holdings.reduce((sum, h) => sum + h.currentValue, 0));
          const totalCost = round2(holdings.reduce((sum, h) => sum + h.costBasis, 0));
          const today = new Date().toISOString().slice(0, 10);
          const existingIdx = s.portfolioSnapshots.findIndex((snap) => snap.date === today);
          const portfolioSnapshots =
            existingIdx >= 0
              ? s.portfolioSnapshots.map((snap, idx) =>
                  idx === existingIdx ? { ...snap, totalValue, totalCost } : snap
                )
              : [...s.portfolioSnapshots, { id: newId(), date: today, totalValue, totalCost }];

          return { investments, portfolioSnapshots };
        });
      },

      addAsset: (a) => set((s) => ({ patrimonioAssets: [...s.patrimonioAssets, { ...a, id: newId() }] })),
      updateAsset: (id, patch) =>
        set((s) => ({
          patrimonioAssets: s.patrimonioAssets.map((a) => (a.id === id ? { ...a, ...patch } : a)),
        })),
      deleteAsset: (id) =>
        set((s) => ({ patrimonioAssets: s.patrimonioAssets.filter((a) => a.id !== id) })),

      addRecurring: (r) =>
        set((s) => ({ recurringTransactions: [...s.recurringTransactions, { ...r, id: newId() }] })),
      updateRecurring: (id, patch) =>
        set((s) => ({
          recurringTransactions: s.recurringTransactions.map((r) =>
            r.id === id ? { ...r, ...patch } : r
          ),
        })),
      deleteRecurring: (id) =>
        set((s) => ({
          recurringTransactions: s.recurringTransactions.filter((r) => r.id !== id),
        })),
      generateDueRecurring: () => {
        const today = new Date();
        const rules = get().recurringTransactions;
        let totalGenerated = 0;
        const newTransactions: Transaction[] = [];
        const ruleUpdates: { id: string; lastGeneratedDate: string }[] = [];

        for (const rule of rules) {
          const due = computeDueOccurrences(rule, today);
          if (due.length === 0) continue;
          const generated = generateTransactionsForRule(rule, due);
          newTransactions.push(...generated);
          ruleUpdates.push({ id: rule.id, lastGeneratedDate: due[due.length - 1] });
          totalGenerated += generated.length;
        }

        if (totalGenerated > 0) {
          set((s) => ({
            transactions: [...s.transactions, ...newTransactions],
            recurringTransactions: s.recurringTransactions.map((r) => {
              const upd = ruleUpdates.find((u) => u.id === r.id);
              return upd ? { ...r, lastGeneratedDate: upd.lastGeneratedDate } : r;
            }),
          }));
        }
        return totalGenerated;
      },

      resetAllData: () =>
        set({
          accounts: [],
          categories: buildDefaultCategories(),
          transactions: [],
          budgets: [],
          investments: [],
          investmentTransactions: [],
          patrimonioAssets: [],
          recurringTransactions: [],
          portfolioSnapshots: [],
          categorizationRules: [],
          selectedTransactionIds: [],
        }),

      loadDemoData: () => {
        const demo = buildDemoDataset();
        set({
          accounts: demo.accounts,
          categories: demo.categories,
          transactions: demo.transactions,
          budgets: demo.budgets,
          investments: demo.investments,
          investmentTransactions: demo.investmentTransactions,
          patrimonioAssets: demo.patrimonioAssets,
          recurringTransactions: demo.recurringTransactions,
          portfolioSnapshots: demo.portfolioSnapshots,
          categorizationRules: demo.categorizationRules,
          selectedTransactionIds: [],
          dashboardLayout: buildDefaultLayout(),
          hiddenDashboardWidgets: [],
        });
      },

      setDashboardLayout: (layout) => set({ dashboardLayout: layout }),
      hideDashboardWidget: (type) =>
        set((s) => ({
          hiddenDashboardWidgets: s.hiddenDashboardWidgets.includes(type)
            ? s.hiddenDashboardWidgets
            : [...s.hiddenDashboardWidgets, type],
        })),
      showDashboardWidget: (type) =>
        set((s) => {
          const layoutHasWidget = s.dashboardLayout.some((l) => l.i === type);
          const layout = layoutHasWidget
            ? s.dashboardLayout
            : [...s.dashboardLayout, buildDefaultLayout().find((l) => l.i === type)!];
          return {
            hiddenDashboardWidgets: s.hiddenDashboardWidgets.filter((t) => t !== type),
            dashboardLayout: layout,
          };
        }),
      resetDashboardLayout: () => set({ dashboardLayout: buildDefaultLayout(), hiddenDashboardWidgets: [] }),

      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
    })
);

export function todayForSeed() {
  return todayISO();
}
