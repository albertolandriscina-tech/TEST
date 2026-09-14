import { useMemo, useState } from 'react';
import { useStore } from '../../store/useStore';
import type { CategoryKind } from '../../types';
import { formatCurrency, MONTH_NAMES_IT, MONTH_NAMES_SHORT_IT } from '../../utils/format';
import { computeActualForCategory as actualForCategory } from '../../utils/ledger';
import { CategoryIconCircle } from '../common/CategoryBadge';

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

/** Testi ed etichette specifici per un budget di uscita ("quanto posso spendere") o una
 * stima di entrata ("quanto prevedo di incassare"): la logica di calcolo è la stessa,
 * cambiano solo le etichette e il verso in cui uno scostamento è considerato negativo. */
const SECTION_COPY: Record<CategoryKind, { title: string; amountLabel: string; actualLabel: string; diffLabel: string; emptyHint: string }> = {
  expense: {
    title: 'Uscite',
    amountLabel: 'Budget',
    actualLabel: 'Speso',
    diffLabel: 'Residuo',
    emptyHint: 'Crea prima delle categorie di uscita per impostare un budget.',
  },
  income: {
    title: 'Entrate (stima)',
    amountLabel: 'Stima',
    actualLabel: 'Incassato',
    diffLabel: 'Differenza',
    emptyHint: 'Crea prima delle categorie di entrata per impostare una stima.',
  },
};

/** True se lo scostamento tra previsto ed effettivo va segnalato (rosso): per le uscite
 * quando si spende più del budget, per le entrate quando si incassa meno della stima. */
function isConcerning(kind: CategoryKind, amount: number, actual: number): boolean {
  return kind === 'expense' ? amount > 0 && actual > amount : amount > 0 && actual < amount;
}

function CategoryBudgetSection({ kind, year, month }: { kind: CategoryKind; year: number; month: number }) {
  const categories = useStore((s) => s.categories);
  const transactions = useStore((s) => s.transactions);
  const budgets = useStore((s) => s.budgets);
  const setBudget = useStore((s) => s.setBudget);
  const copy = SECTION_COPY[kind];

  const roots = categories.filter((c) => c.kind === kind && !c.parentId && !c.archived && !c.system);

  const totalAmount = roots.reduce(
    (s, c) => s + (budgets.find((b) => b.categoryId === c.id && b.year === year && b.month === month)?.amount ?? 0),
    0
  );
  const totalActual = roots.reduce((s, c) => s + actualForCategory(transactions, categories, c.id, year, month), 0);
  const totalDiff = kind === 'expense' ? totalAmount - totalActual : totalActual - totalAmount;

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-slate-700">{copy.title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="card">
          <span className="text-xs text-slate-400 uppercase">{copy.amountLabel} totale</span>
          <div className="text-xl font-semibold text-slate-800">{formatCurrency(totalAmount)}</div>
        </div>
        <div className="card">
          <span className="text-xs text-slate-400 uppercase">{copy.actualLabel}</span>
          <div className={`text-xl font-semibold ${kind === 'expense' ? 'text-red-600' : 'text-emerald-600'}`}>
            {formatCurrency(totalActual)}
          </div>
        </div>
        <div className="card">
          <span className="text-xs text-slate-400 uppercase">{copy.diffLabel}</span>
          <div className={`text-xl font-semibold ${totalDiff >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {formatCurrency(totalDiff)}
          </div>
        </div>
      </div>

      {roots.length === 0 && <div className="card text-center text-slate-400 py-6">{copy.emptyHint}</div>}

      {/* Vista a card: sotto sm */}
      <div className="sm:hidden space-y-2">
        {roots.map((cat) => {
          const budget = budgets.find((b) => b.categoryId === cat.id && b.year === year && b.month === month);
          const actual = actualForCategory(transactions, categories, cat.id, year, month);
          const amount = budget?.amount ?? 0;
          const pct = amount > 0 ? Math.min(100, (actual / amount) * 100) : actual > 0 ? 100 : 0;
          const concerning = isConcerning(kind, amount, actual);
          const diff = kind === 'expense' ? amount - actual : actual - amount;
          return (
            <div key={cat.id} className="card">
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 min-w-0 font-medium text-slate-700 truncate">
                  <CategoryIconCircle category={cat} />
                  <span className="truncate">{cat.name}</span>
                </span>
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
                <span className="text-slate-500">
                  {copy.actualLabel}: {formatCurrency(actual)}
                </span>
                <span className={`font-medium ${diff >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {copy.diffLabel}: {formatCurrency(diff)}
                </span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden mt-2">
                <div className={`h-full rounded-full ${concerning ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
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
              <th className="text-right">{copy.amountLabel}</th>
              <th className="text-right">{copy.actualLabel}</th>
              <th className="text-right">{copy.diffLabel}</th>
              <th>Andamento</th>
            </tr>
          </thead>
          <tbody>
            {roots.map((cat) => {
              const budget = budgets.find((b) => b.categoryId === cat.id && b.year === year && b.month === month);
              const actual = actualForCategory(transactions, categories, cat.id, year, month);
              const amount = budget?.amount ?? 0;
              const pct = amount > 0 ? Math.min(100, (actual / amount) * 100) : actual > 0 ? 100 : 0;
              const concerning = isConcerning(kind, amount, actual);
              const diff = kind === 'expense' ? amount - actual : actual - amount;
              return (
                <tr key={cat.id}>
                  <td className="font-medium text-slate-700">
                    <span className="flex items-center gap-2">
                      <CategoryIconCircle category={cat} />
                      {cat.name}
                    </span>
                  </td>
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
                  <td className={`text-right font-medium ${diff >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatCurrency(diff)}</td>
                  <td className="min-w-[120px]">
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div className={`h-full rounded-full ${concerning ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
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

/** `month` assente = vista annuale: somma i 12 valori mensili di stima/budget e l'intero anno di movimenti. */
function ForecastCard({ year, month }: { year: number; month?: number }) {
  const categories = useStore((s) => s.categories);
  const transactions = useStore((s) => s.transactions);
  const budgets = useStore((s) => s.budgets);

  const totalFor = (kind: CategoryKind) =>
    categories
      .filter((c) => c.kind === kind && !c.parentId && !c.archived && !c.system)
      .reduce((s, c) => {
        if (month) {
          return s + (budgets.find((b) => b.categoryId === c.id && b.year === year && b.month === month)?.amount ?? 0);
        }
        const annualSum = Array.from({ length: 12 }, (_, i) => i + 1).reduce(
          (acc, m) => acc + (budgets.find((b) => b.categoryId === c.id && b.year === year && b.month === m)?.amount ?? 0),
          0
        );
        return s + annualSum;
      }, 0);

  const actualFor = (kind: CategoryKind) =>
    categories
      .filter((c) => c.kind === kind && !c.parentId && !c.archived && !c.system)
      .reduce((s, c) => s + actualForCategory(transactions, categories, c.id, year, month), 0);

  const stimaEntrate = totalFor('income');
  const budgetUscite = totalFor('expense');
  const risparmioPrevisto = stimaEntrate - budgetUscite;
  const risparmioReale = actualFor('income') - actualFor('expense');

  return (
    <div className="card flex flex-wrap items-center justify-between gap-3 bg-primary-50 border-primary-100">
      <div>
        <span className="text-xs text-primary-700 uppercase font-medium">Risparmio previsto</span>
        <div className={`text-xl font-semibold ${risparmioPrevisto >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
          {formatCurrency(risparmioPrevisto)}
        </div>
        <p className="text-xs text-primary-700/70">
          {month ? 'Stima entrate − budget uscite' : "Somma annuale delle stime entrate − budget uscite"}
        </p>
      </div>
      <div className="text-right">
        <span className="text-xs text-primary-700 uppercase font-medium">
          Risparmio reale {month ? '(finora)' : "(anno, finora)"}
        </span>
        <div className={`text-xl font-semibold ${risparmioReale >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
          {formatCurrency(risparmioReale)}
        </div>
        <p className="text-xs text-primary-700/70">Incassato − speso {month ? '' : "nell'anno"}</p>
      </div>
    </div>
  );
}

function MonthlyBudgetView({ year, month }: { year: number; month: number }) {
  return (
    <div className="space-y-6">
      <ForecastCard year={year} month={month} />
      <CategoryBudgetSection kind="expense" year={year} month={month} />
      <CategoryBudgetSection kind="income" year={year} month={month} />
    </div>
  );
}

const ANNUAL_SECTION_COPY: Record<CategoryKind, { title: string; totalAmountLabel: string; totalActualLabel: string; emptyHint: string }> = {
  expense: {
    title: 'Uscite',
    totalAmountLabel: 'Budget annuale totale',
    totalActualLabel: "Speso nell'anno",
    emptyHint: 'Nessuna categoria di uscita disponibile.',
  },
  income: {
    title: 'Entrate (stima)',
    totalAmountLabel: 'Stima annuale totale',
    totalActualLabel: "Incassato nell'anno",
    emptyHint: 'Nessuna categoria di entrata disponibile.',
  },
};

function AnnualCategorySection({ kind, year }: { kind: CategoryKind; year: number }) {
  const categories = useStore((s) => s.categories);
  const transactions = useStore((s) => s.transactions);
  const budgets = useStore((s) => s.budgets);
  const copy = ANNUAL_SECTION_COPY[kind];

  const roots = categories.filter((c) => c.kind === kind && !c.parentId && !c.archived && !c.system);

  const rows = roots.map((cat) => {
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
  const grandDiff = kind === 'expense' ? grandBudget - grandActual : grandActual - grandBudget;

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-slate-700">{copy.title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="card">
          <span className="text-xs text-slate-400 uppercase">{copy.totalAmountLabel}</span>
          <div className="text-xl font-semibold text-slate-800">{formatCurrency(grandBudget)}</div>
          <span className="text-[11px] text-slate-400">Somma dei valori mensili di {year}</span>
        </div>
        <div className="card">
          <span className="text-xs text-slate-400 uppercase">{copy.totalActualLabel}</span>
          <div className={`text-xl font-semibold ${kind === 'expense' ? 'text-red-600' : 'text-emerald-600'}`}>
            {formatCurrency(grandActual)}
          </div>
        </div>
        <div className="card">
          <span className="text-xs text-slate-400 uppercase">{kind === 'expense' ? 'Residuo annuale' : 'Differenza annuale'}</span>
          <div className={`text-xl font-semibold ${grandDiff >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatCurrency(grandDiff)}</div>
        </div>
      </div>

      {rows.length === 0 && <div className="card text-center text-slate-400 py-6">{copy.emptyHint}</div>}

      {/* Vista a card: sotto sm, riepilogo annuale per categoria */}
      <div className="sm:hidden space-y-2">
        {rows.map(({ cat, annualBudget, annualActual }) => {
          const pct = annualBudget > 0 ? Math.min(100, (annualActual / annualBudget) * 100) : annualActual > 0 ? 100 : 0;
          const concerning = isConcerning(kind, annualBudget, annualActual);
          return (
            <div key={cat.id} className="card">
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 min-w-0 font-medium text-slate-700 truncate">
                  <CategoryIconCircle category={cat} />
                  <span className="truncate">{cat.name}</span>
                </span>
                <span className="text-sm text-slate-500 shrink-0">{formatCurrency(annualBudget)}</span>
              </div>
              <div className="flex items-center justify-between mt-2 text-sm">
                <span className="text-slate-500">
                  {ANNUAL_SECTION_COPY[kind].totalActualLabel}: {formatCurrency(annualActual)}
                </span>
                <span className={`font-medium ${concerning ? 'text-red-600' : 'text-emerald-600'}`}>
                  {annualActual - annualBudget >= 0 ? '+' : ''}
                  {formatCurrency(annualActual - annualBudget)}
                </span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden mt-2">
                <div className={`h-full rounded-full ${concerning ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
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
              <th className="text-right">Tot. {kind === 'expense' ? 'Budget' : 'Stima'}</th>
              <th className="text-right">Tot. {kind === 'expense' ? 'Speso' : 'Incassato'}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ cat, monthly, annualBudget, annualActual }) => (
              <tr key={cat.id}>
                <td className="font-medium text-slate-700 sticky left-0 bg-white">
                  <span className="flex items-center gap-2">
                    <CategoryIconCircle category={cat} />
                    {cat.name}
                  </span>
                </td>
                {monthly.map((m, i) => (
                  <td key={i} className="text-right text-xs">
                    <div className="text-slate-400">{formatCurrency(m.budget)}</div>
                    <div className={isConcerning(kind, m.budget, m.actual) ? 'text-red-600 font-medium' : 'text-slate-600'}>
                      {formatCurrency(m.actual)}
                    </div>
                  </td>
                ))}
                <td className="text-right font-semibold">{formatCurrency(annualBudget)}</td>
                <td className={`text-right font-semibold ${isConcerning(kind, annualBudget, annualActual) ? 'text-red-600' : 'text-slate-700'}`}>
                  {formatCurrency(annualActual)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="hidden sm:block text-xs text-slate-400">
        Ogni cella mensile mostra il valore impostato (in grigio) e {kind === 'expense' ? 'la spesa effettiva' : "l'incasso effettivo"}{' '}
        (sotto). Il totale annuale è la somma dei 12 valori mensili.
      </p>
    </div>
  );
}

function AnnualBudgetView({ year }: { year: number }) {
  return (
    <div className="space-y-6">
      <ForecastCard year={year} />
      <AnnualCategorySection kind="expense" year={year} />
      <AnnualCategorySection kind="income" year={year} />
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
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-800">Budget</h1>
          <p className="text-sm text-slate-500">Imposta i budget di uscita e le stime di entrata per categoria, mensili e annuali.</p>
        </div>
        <div className="flex gap-2">
          <div className="flex rounded-lg overflow-hidden border border-slate-200">
            <button
              className={`px-3 py-1.5 text-sm font-medium ${view === 'monthly' ? 'bg-primary-600 text-white' : 'bg-white text-slate-600'}`}
              onClick={() => setView('monthly')}
            >
              Mensile
            </button>
            <button
              className={`px-3 py-1.5 text-sm font-medium ${view === 'annual' ? 'bg-primary-600 text-white' : 'bg-white text-slate-600'}`}
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
