import { create } from 'zustand';
import { persist } from 'zustand/middleware';
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
import { newId, todayISO } from '../utils/id';
import { buildDefaultCategories, SYSTEM_CATEGORY_INVESTMENT_BUY, SYSTEM_CATEGORY_INVESTMENT_SELL } from './seed';
import { buildDemoDataset } from './demoData';
import { computeDueOccurrences, generateTransactionsForRule } from '../utils/recurring';

interface State {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  investments: Investment[];
  investmentTransactions: InvestmentTransaction[];
  patrimonioAssets: PatrimonioAsset[];
  recurringTransactions: RecurringTransaction[];
  selectedTransactionIds: string[];

  // Conti
  addAccount: (a: Omit<Account, 'id' | 'createdAt'>) => void;
  updateAccount: (id: string, patch: Partial<Account>) => void;
  deleteAccount: (id: string) => void;

  // Categorie
  addCategory: (c: Omit<Category, 'id'>) => void;
  updateCategory: (id: string, patch: Partial<Category>) => void;
  deleteCategory: (id: string) => void;

  // Movimenti
  addTransaction: (t: Omit<Transaction, 'id' | 'createdAt'>) => void;
  updateTransaction: (id: string, patch: Partial<Transaction>) => void;
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

  // Patrimonio
  addAsset: (a: Omit<PatrimonioAsset, 'id'>) => void;
  updateAsset: (id: string, patch: Partial<PatrimonioAsset>) => void;
  deleteAsset: (id: string) => void;

  // Ricorrenti
  addRecurring: (r: Omit<RecurringTransaction, 'id'>) => void;
  updateRecurring: (id: string, patch: Partial<RecurringTransaction>) => void;
  deleteRecurring: (id: string) => void;
  generateDueRecurring: () => number;

  ensureSystemCategories: () => { buyId: string; sellId: string };
  resetAllData: () => void;
  loadDemoData: () => void;
}

const demoDataset = buildDemoDataset();

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      accounts: demoDataset.accounts,
      categories: demoDataset.categories,
      transactions: demoDataset.transactions,
      budgets: demoDataset.budgets,
      investments: demoDataset.investments,
      investmentTransactions: demoDataset.investmentTransactions,
      patrimonioAssets: demoDataset.patrimonioAssets,
      recurringTransactions: demoDataset.recurringTransactions,
      selectedTransactionIds: [],

      addAccount: (a) =>
        set((s) => ({
          accounts: [...s.accounts, { ...a, id: newId(), createdAt: new Date().toISOString() }],
        })),
      updateAccount: (id, patch) =>
        set((s) => ({ accounts: s.accounts.map((a) => (a.id === id ? { ...a, ...patch } : a)) })),
      deleteAccount: (id) =>
        set((s) => ({
          accounts: s.accounts.filter((a) => a.id !== id),
          transactions: s.transactions.filter((t) => t.accountId !== id && t.toAccountId !== id),
        })),

      addCategory: (c) => set((s) => ({ categories: [...s.categories, { ...c, id: newId() }] })),
      updateCategory: (id, patch) =>
        set((s) => ({ categories: s.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
      deleteCategory: (id) =>
        set((s) => ({
          categories: s.categories.filter((c) => c.id !== id && c.parentId !== id),
          transactions: s.transactions.map((t) =>
            t.categoryId === id ? { ...t, categoryId: null } : t
          ),
          budgets: s.budgets.filter((b) => b.categoryId !== id),
        })),

      addTransaction: (t) =>
        set((s) => ({
          transactions: [
            ...s.transactions,
            { ...t, id: newId(), createdAt: new Date().toISOString() },
          ],
        })),
      updateTransaction: (id, patch) =>
        set((s) => ({
          transactions: s.transactions.map((t) => (t.id === id ? { ...t, ...patch } : t)),
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
        const toAdd: Category[] = [];
        if (!buy) {
          buy = { id: newId(), name: SYSTEM_CATEGORY_INVESTMENT_BUY, kind: 'expense', parentId: null, system: true };
          toAdd.push(buy);
        }
        if (!sell) {
          sell = { id: newId(), name: SYSTEM_CATEGORY_INVESTMENT_SELL, kind: 'income', parentId: null, system: true };
          toAdd.push(sell);
        }
        if (toAdd.length) {
          set((st) => ({ categories: [...st.categories, ...toAdd] }));
        }
        return { buyId: buy.id, sellId: sell.id };
      },

      addInvestmentTransaction: (op) => {
        const { buyId, sellId } = get().ensureSystemCategories();
        const id = newId();
        const investment = get().investments.find((i) => i.id === op.investmentId);
        const total =
          op.type === 'buy' ? op.quantity * op.price + op.fees : op.quantity * op.price - op.fees;

        const linkedTx: Transaction = {
          id: newId(),
          date: op.date,
          description: `${op.type === 'buy' ? 'Acquisto' : 'Vendita'} ${investment?.name ?? ''}`.trim(),
          amount: Math.max(total, 0),
          type: op.type === 'buy' ? 'expense' : 'income',
          accountId: op.cashAccountId,
          categoryId: op.type === 'buy' ? buyId : sellId,
          toAccountId: null,
          investmentTxId: id,
          createdAt: new Date().toISOString(),
        };

        set((s) => ({
          investmentTransactions: [...s.investmentTransactions, { ...op, id, createdAt: new Date().toISOString() }],
          transactions: [...s.transactions, linkedTx],
        }));
      },
      deleteInvestmentTransaction: (id) =>
        set((s) => ({
          investmentTransactions: s.investmentTransactions.filter((it) => it.id !== id),
          transactions: s.transactions.filter((t) => t.investmentTxId !== id),
        })),

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
          selectedTransactionIds: [],
        });
      },
    }),
    {
      name: 'finanza-personale-storage',
      version: 1,
    }
  )
);

export function todayForSeed() {
  return todayISO();
}
