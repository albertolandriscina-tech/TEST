import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../../../store/useStore';
import { getCategoryAndDescendantIds } from '../../../utils/ledger';
import { formatCurrency, MONTH_NAMES_IT } from '../../../utils/format';

function actualForCategory(
  transactions: ReturnType<typeof useStore.getState>['transactions'],
  categories: ReturnType<typeof useStore.getState>['categories'],
  categoryId: string,
  year: number,
  month: number
) {
  const ids = getCategoryAndDescendantIds(categoryId, categories);
  return transactions
    .filter((t) => t.categoryId && ids.includes(t.categoryId))
    .filter((t) => Number(t.date.slice(0, 4)) === year && Number(t.date.slice(5, 7)) === month)
    .reduce((s, t) => s + t.amount, 0);
}

export function BudgetWidget() {
  const categories = useStore((s) => s.categories);
  const transactions = useStore((s) => s.transactions);
  const budgets = useStore((s) => s.budgets);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const expenseRoots = useMemo(
    () => categories.filter((c) => c.kind === 'expense' && !c.parentId && !c.archived && !c.system),
    [categories]
  );

  const ratioOf = (amount: number, actual: number) => (amount > 0 ? actual / amount : actual > 0 ? 999 : -1);

  const rows = useMemo(
    () =>
      expenseRoots
        .map((cat) => {
          const amount = budgets.find((b) => b.categoryId === cat.id && b.year === year && b.month === month)?.amount ?? 0;
          const actual = actualForCategory(transactions, categories, cat.id, year, month);
          return { cat, amount, actual };
        })
        .sort((a, b) => ratioOf(b.amount, b.actual) - ratioOf(a.amount, a.actual)),
    [expenseRoots, budgets, transactions, categories, year, month]
  );

  const totalBudget = rows.reduce((s, r) => s + r.amount, 0);
  const totalActual = rows.reduce((s, r) => s + r.actual, 0);
  const pct = totalBudget > 0 ? Math.min(100, (totalActual / totalBudget) * 100) : totalActual > 0 ? 100 : 0;

  return (
    <div className="flex flex-col h-full gap-3">
      <div>
        <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
          <span>
            {MONTH_NAMES_IT[month - 1]} {year}
          </span>
          <span>
            {formatCurrency(totalActual)} / {formatCurrency(totalBudget)}
          </span>
        </div>
        <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
          <div className={`h-full rounded-full ${totalActual > totalBudget && totalBudget > 0 ? 'bg-red-500' : 'bg-indigo-500'}`} style={{ width: `${pct}%` }} />
        </div>
      </div>

      <ul className="flex-1 overflow-auto space-y-2 min-h-0">
        {rows.map(({ cat, amount, actual }) => {
          const catPct = amount > 0 ? Math.min(100, (actual / amount) * 100) : actual > 0 ? 100 : 0;
          const over = amount > 0 && actual > amount;
          return (
            <li key={cat.id}>
              <div className="flex items-center justify-between text-xs mb-0.5">
                <span className="text-slate-600 truncate">{cat.name}</span>
                <span className={`whitespace-nowrap ${over ? 'text-red-600 font-medium' : 'text-slate-500'}`}>
                  {formatCurrency(actual)} {amount > 0 && `/ ${formatCurrency(amount)}`}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div className={`h-full rounded-full ${over ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${catPct}%` }} />
              </div>
            </li>
          );
        })}
        {rows.length === 0 && <p className="text-sm text-slate-400 text-center py-6">Nessuna categoria di spesa.</p>}
      </ul>

      <Link to="/budget" className="text-xs font-medium text-indigo-600 hover:underline self-start">
        Vedi tutto il budget →
      </Link>
    </div>
  );
}
