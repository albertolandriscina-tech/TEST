import { useMemo, useState } from 'react';
import { useStore } from '../../store/useStore';
import { formatCurrency, MONTH_NAMES_IT, MONTH_NAMES_SHORT_IT } from '../../utils/format';
import { getCategoryAndDescendantIds } from '../../utils/ledger';

function useYears() {
  const transactions = useStore((s) => s.transactions);
  const budgets = useStore((s) => s.budgets);
  return useMemo(() => {
    const years = new Set<number>();
    const now = new Date().getFullYear();
    years.add(now);
    transactions.forEach((t) => years.add(Number(t.date.slice(0, 4))));
    budgets.forEach((b) => years.add(b.year));
    return Array.from(years).sort((a, b) => b - a);
  }, [transactions, budgets]);
}

function actualForCategory(
  transactions: ReturnType<typeof useStore.getState>['transactions'],
  categories: ReturnType<typeof useStore.getState>['categories'],
  categoryId: string,
  year: number,
  month?: number
) {
  const ids = getCategoryAndDescendantIds(categoryId, categories);
  return transactions
    .filter((t) => t.categoryId && ids.includes(t.categoryId))
    .filter((t) => Number(t.date.slice(0, 4)) === year)
    .filter((t) => (month ? Number(t.date.slice(5, 7)) === month : true))
    .reduce((s, t) => s + t.amount, 0);
}

function MonthlyBudgetView({ year, month }: { year: number; month: number }) {
  const categories = useStore((s) => s.categories);
  const transactions = useStore((s) => s.transactions);
  const budgets = useStore((s) => s.budgets);
  const setBudget = useStore((s) => s.setBudget);

  const expenseRoots = categories.filter((c) => c.kind === 'expense' && !c.parentId && !c.archived && !c.system);

  const totalBudget = expenseRoots.reduce(
    (s, c) => s + (budgets.find((b) => b.categoryId === c.id && b.year === year && b.month === month)?.amount ?? 0),
    0
  );
  const totalActual = expenseRoots.reduce((s, c) => s + actualForCategory(transactions, categories, c.id, year, month), 0);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="card">
          <span className="text-xs text-slate-400 uppercase">Budget totale</span>
          <div className="text-xl font-semibold text-slate-800">{formatCurrency(totalBudget)}</div>
        </div>
        <div className="card">
          <span className="text-xs text-slate-400 uppercase">Speso</span>
          <div className="text-xl font-semibold text-red-600">{formatCurrency(totalActual)}</div>
        </div>
        <div className="card">
          <span className="text-xs text-slate-400 uppercase">Residuo</span>
          <div className={`text-xl font-semibold ${totalBudget - totalActual >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {formatCurrency(totalBudget - totalActual)}
          </div>
        </div>
      </div>

      {expenseRoots.length === 0 && (
        <div className="card text-center text-slate-400 py-6">Crea prima delle categorie di uscita per impostare un budget.</div>
      )}

      {/* Vista a card: sotto sm */}
      <div className="sm:hidden space-y-2">
        {expenseRoots.map((cat) => {
          const budget = budgets.find((b) => b.categoryId === cat.id && b.year === year && b.month === month);
          const actual = actualForCategory(transactions, categories, cat.id, year, month);
          const amount = budget?.amount ?? 0;
          const pct = amount > 0 ? Math.min(100, (actual / amount) * 100) : actual > 0 ? 100 : 0;
          const over = amount > 0 && actual > amount;
          return (
            <div key={cat.id} className="card">
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium text-slate-700 truncate">{cat.name}</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  className="input !w-24 !py-1 text-right shrink-0"
                  value={amount || ''}
                  placeholder="0"
                  onChange={(e) => setBudget(cat.id, year, month, Number(e.target.value) || 0)}
                />
              </div>
              <div className="flex items-center justify-between mt-2 text-sm">
                <span className="text-slate-500">Speso: {formatCurrency(actual)}</span>
                <span className={`font-medium ${amount - actual >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  Residuo: {formatCurrency(amount - actual)}
                </span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden mt-2">
                <div className={`h-full rounded-full ${over ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Vista a tabella: da sm in su */}
      <div className="hidden sm:block card !p-0 overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Categoria</th>
              <th className="text-right">Budget</th>
              <th className="text-right">Speso</th>
              <th className="text-right">Residuo</th>
              <th>Andamento</th>
            </tr>
          </thead>
          <tbody>
            {expenseRoots.map((cat) => {
              const budget = budgets.find((b) => b.categoryId === cat.id && b.year === year && b.month === month);
              const actual = actualForCategory(transactions, categories, cat.id, year, month);
              const amount = budget?.amount ?? 0;
              const pct = amount > 0 ? Math.min(100, (actual / amount) * 100) : actual > 0 ? 100 : 0;
              const over = amount > 0 && actual > amount;
              return (
                <tr key={cat.id}>
                  <td className="font-medium text-slate-700">{cat.name}</td>
                  <td className="text-right">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      className="input !w-28 !py-1 text-right ml-auto"
                      value={amount || ''}
                      placeholder="0"
                      onChange={(e) => setBudget(cat.id, year, month, Number(e.target.value) || 0)}
                    />
                  </td>
                  <td className="text-right text-slate-600">{formatCurrency(actual)}</td>
                  <td className={`text-right font-medium ${amount - actual >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {formatCurrency(amount - actual)}
                  </td>
                  <td className="min-w-[120px]">
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${over ? 'bg-red-500' : 'bg-emerald-500'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AnnualBudgetView({ year }: { year: number }) {
  const categories = useStore((s) => s.categories);
  const transactions = useStore((s) => s.transactions);
  const budgets = useStore((s) => s.budgets);

  const expenseRoots = categories.filter((c) => c.kind === 'expense' && !c.parentId && !c.archived && !c.system);

  const rows = expenseRoots.map((cat) => {
    const monthly = Array.from({ length: 12 }, (_, i) => {
      const m = i + 1;
      const b = budgets.find((x) => x.categoryId === cat.id && x.year === year && x.month === m)?.amount ?? 0;
      const a = actualForCategory(transactions, categories, cat.id, year, m);
      return { budget: b, actual: a };
    });
    const annualBudget = monthly.reduce((s, m) => s + m.budget, 0);
    const annualActual = monthly.reduce((s, m) => s + m.actual, 0);
    return { cat, monthly, annualBudget, annualActual };
  });

  const grandBudget = rows.reduce((s, r) => s + r.annualBudget, 0);
  const grandActual = rows.reduce((s, r) => s + r.annualActual, 0);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="card">
          <span className="text-xs text-slate-400 uppercase">Budget annuale totale</span>
          <div className="text-xl font-semibold text-slate-800">{formatCurrency(grandBudget)}</div>
          <span className="text-[11px] text-slate-400">Somma dei budget mensili di {year}</span>
        </div>
        <div className="card">
          <span className="text-xs text-slate-400 uppercase">Speso nell'anno</span>
          <div className="text-xl font-semibold text-red-600">{formatCurrency(grandActual)}</div>
        </div>
        <div className="card">
          <span className="text-xs text-slate-400 uppercase">Residuo annuale</span>
          <div className={`text-xl font-semibold ${grandBudget - grandActual >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {formatCurrency(grandBudget - grandActual)}
          </div>
        </div>
      </div>

      {rows.length === 0 && (
        <div className="card text-center text-slate-400 py-6">Nessuna categoria di uscita disponibile.</div>
      )}

      {/* Vista a card: sotto sm, riepilogo annuale per categoria */}
      <div className="sm:hidden space-y-2">
        {rows.map(({ cat, annualBudget, annualActual }) => {
          const pct = annualBudget > 0 ? Math.min(100, (annualActual / annualBudget) * 100) : annualActual > 0 ? 100 : 0;
          const over = annualBudget > 0 && annualActual > annualBudget;
          return (
            <div key={cat.id} className="card">
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium text-slate-700 truncate">{cat.name}</span>
                <span className="text-sm text-slate-500 shrink-0">{formatCurrency(annualBudget)} budget</span>
              </div>
              <div className="flex items-center justify-between mt-2 text-sm">
                <span className="text-slate-500">Speso nell'anno: {formatCurrency(annualActual)}</span>
                <span className={`font-medium ${over ? 'text-red-600' : 'text-emerald-600'}`}>
                  {over ? '+' : ''}
                  {formatCurrency(annualActual - annualBudget)}
                </span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden mt-2">
                <div className={`h-full rounded-full ${over ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
        {rows.length > 0 && (
          <p className="text-xs text-slate-400 px-1">
            Per il dettaglio mese per mese, consulta questa pagina da tablet o desktop (o ruota lo schermo).
          </p>
        )}
      </div>

      {/* Vista a tabella con dettaglio mensile: da sm in su */}
      <div className="hidden sm:block card !p-0 overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th className="sticky left-0 bg-white">Categoria</th>
              {MONTH_NAMES_SHORT_IT.map((m) => (
                <th key={m} className="text-right">
                  {m}
                </th>
              ))}
              <th className="text-right">Tot. Budget</th>
              <th className="text-right">Tot. Speso</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ cat, monthly, annualBudget, annualActual }) => (
              <tr key={cat.id}>
                <td className="font-medium text-slate-700 sticky left-0 bg-white">{cat.name}</td>
                {monthly.map((m, i) => (
                  <td key={i} className="text-right text-xs">
                    <div className="text-slate-400">{formatCurrency(m.budget)}</div>
                    <div className={m.actual > m.budget && m.budget > 0 ? 'text-red-600 font-medium' : 'text-slate-600'}>
                      {formatCurrency(m.actual)}
                    </div>
                  </td>
                ))}
                <td className="text-right font-semibold">{formatCurrency(annualBudget)}</td>
                <td className={`text-right font-semibold ${annualActual > annualBudget && annualBudget > 0 ? 'text-red-600' : 'text-slate-700'}`}>
                  {formatCurrency(annualActual)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="hidden sm:block text-xs text-slate-400">
        Ogni cella mensile mostra il budget impostato (in grigio) e la spesa effettiva (sotto). Il totale annuale è la somma
        dei 12 budget mensili.
      </p>
    </div>
  );
}

export function BudgetsPage() {
  const years = useYears();
  const [year, setYear] = useState(years[0] ?? new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [view, setView] = useState<'monthly' | 'annual'>('monthly');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Budget</h1>
          <p className="text-sm text-slate-500">Imposta i budget per categoria, mensili e annuali.</p>
        </div>
        <div className="flex gap-2">
          <div className="flex rounded-lg overflow-hidden border border-slate-200">
            <button
              className={`px-3 py-1.5 text-sm font-medium ${view === 'monthly' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600'}`}
              onClick={() => setView('monthly')}
            >
              Mensile
            </button>
            <button
              className={`px-3 py-1.5 text-sm font-medium ${view === 'annual' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600'}`}
              onClick={() => setView('annual')}
            >
              Annuale
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-3 items-end">
        {view === 'monthly' && (
          <div>
            <label className="label">Mese</label>
            <select className="input" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {MONTH_NAMES_IT.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="label">Anno</label>
          <select className="input" value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {view === 'monthly' ? <MonthlyBudgetView year={year} month={month} /> : <AnnualBudgetView year={year} />}
    </div>
  );
}
