import { useMemo, useState } from 'react';
import { endOfMonth, endOfYear, format, parseISO, startOfMonth, startOfYear, subDays } from 'date-fns';
import { ArrowDownRight, ArrowUpRight, ChevronDown, ChevronRight } from 'lucide-react';
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useStore } from '../../store/useStore';
import {
  buildCategoryBreakdown,
  buildCustomRangeCashFlow,
  buildDailyCashFlow,
  sumByType,
  type CategoryBreakdownItem,
} from '../../utils/analytics';
import { formatCurrency, formatDate, formatNumber } from '../../utils/format';
import { getAccentColor } from '../../utils/theme';
import { CategoryIconCircle } from '../common/CategoryBadge';

type Period = 'month' | 'year' | 'custom';

function monthInputValue(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function dateInputValue(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

function pctDelta(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null; // null = "n/d" (nessun confronto significativo)
  return ((current - previous) / Math.abs(previous)) * 100;
}

function DeltaBadge({ value, invert = false }: { value: number | null; invert?: boolean }) {
  if (value === null) return <span className="text-xs text-slate-400">vs periodo prec. n/d</span>;
  const positive = invert ? value <= 0 : value >= 0;
  const Icon = value >= 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${positive ? 'text-emerald-600' : 'text-red-600'}`}>
      <Icon size={13} />
      {value >= 0 ? '+' : ''}
      {formatNumber(value, 1)}% <span className="text-slate-400 font-normal">vs prec.</span>
    </span>
  );
}

function CategoryBreakdownList({ items, total }: { items: CategoryBreakdownItem[]; total: number }) {
  const accent = getAccentColor(useStore((s) => s.settings.colorTheme));
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setExpanded((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  if (items.length === 0) {
    return <p className="text-sm text-slate-400 text-center py-6">Nessun movimento nel periodo selezionato.</p>;
  }

  return (
    <ul className="space-y-2.5">
      {items.map((item) => {
        const isOpen = expanded.has(item.category.id);
        const hasChildren = item.children.length > 0;
        return (
          <li key={item.category.id}>
            <button
              type="button"
              className={`w-full text-left ${hasChildren ? 'cursor-pointer' : 'cursor-default'}`}
              onClick={() => hasChildren && toggle(item.category.id)}
            >
              <div className="flex items-center justify-between gap-2 text-sm mb-1">
                <span className="flex items-center gap-1.5 min-w-0 text-slate-700 font-medium">
                  {hasChildren &&
                    (isOpen ? (
                      <ChevronDown size={14} className="text-slate-400 shrink-0" />
                    ) : (
                      <ChevronRight size={14} className="text-slate-400 shrink-0" />
                    ))}
                  <CategoryIconCircle category={item.category} />
                  <span className="truncate">{item.category.name}</span>
                </span>
                <span className="text-right shrink-0">
                  <span className="font-medium text-slate-700">{formatCurrency(item.amount)}</span>{' '}
                  <span className="text-xs text-slate-400">({formatNumber(item.pct, 0)}%)</span>
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.min(100, item.pct)}%`, backgroundColor: item.category.color ?? accent }}
                />
              </div>
            </button>
            {isOpen && hasChildren && (
              <ul className="mt-2 ml-6 space-y-1.5 border-l border-slate-100 pl-3">
                {item.children.map((child) => (
                  <li key={child.category.id} className="flex items-center justify-between gap-2 text-xs">
                    <span className="flex items-center gap-1.5 min-w-0 text-slate-500">
                      <CategoryIconCircle category={child.category} size="sm" />
                      <span className="truncate">{child.category.name}</span>
                    </span>
                    <span className="shrink-0 text-slate-500">
                      {formatCurrency(child.amount)} <span className="text-slate-400">({formatNumber(child.pct, 0)}%)</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
      <li className="flex items-center justify-between text-sm font-semibold text-slate-700 pt-1 border-t border-slate-100">
        <span>Totale</span>
        <span>{formatCurrency(total)}</span>
      </li>
    </ul>
  );
}

export function AnalysisPage() {
  const transactions = useStore((s) => s.transactions);
  const categories = useStore((s) => s.categories);
  const accent = getAccentColor(useStore((s) => s.settings.colorTheme));

  const [period, setPeriod] = useState<Period>('month');
  const now = new Date();
  const [monthValue, setMonthValue] = useState(monthInputValue(now));
  const [yearValue, setYearValue] = useState(now.getFullYear());
  const [fromDate, setFromDate] = useState(dateInputValue(startOfMonth(new Date(now.getFullYear(), now.getMonth() - 2, 1))));
  const [toDate, setToDate] = useState(dateInputValue(now));

  const { fromISO, toISO, prevFromISO, prevToISO, granularity } = useMemo(() => {
    if (period === 'month') {
      const [y, m] = monthValue.split('-').map(Number);
      const from = startOfMonth(new Date(y, m - 1, 1));
      const to = endOfMonth(from);
      const prevFrom = startOfMonth(subDays(from, 1));
      const prevTo = endOfMonth(prevFrom);
      return {
        fromISO: dateInputValue(from),
        toISO: dateInputValue(to),
        prevFromISO: dateInputValue(prevFrom),
        prevToISO: dateInputValue(prevTo),
        granularity: 'day' as const,
      };
    }
    if (period === 'year') {
      const from = startOfYear(new Date(yearValue, 0, 1));
      const to = endOfYear(from);
      const prevFrom = startOfYear(new Date(yearValue - 1, 0, 1));
      const prevTo = endOfYear(prevFrom);
      return {
        fromISO: dateInputValue(from),
        toISO: dateInputValue(to),
        prevFromISO: dateInputValue(prevFrom),
        prevToISO: dateInputValue(prevTo),
        granularity: 'month' as const,
      };
    }
    const from = parseISO(fromDate);
    const to = parseISO(toDate);
    const lengthDays = Math.max(0, Math.round((to.getTime() - from.getTime()) / 86400000));
    const prevTo = subDays(from, 1);
    const prevFrom = subDays(prevTo, lengthDays);
    return {
      fromISO: fromDate,
      toISO: toDate,
      prevFromISO: dateInputValue(prevFrom),
      prevToISO: dateInputValue(prevTo),
      granularity: 'month' as const,
    };
  }, [period, monthValue, yearValue, fromDate, toDate]);

  const entrate = sumByType(transactions, 'income', parseISO(fromISO), parseISO(toISO));
  const uscite = sumByType(transactions, 'expense', parseISO(fromISO), parseISO(toISO));
  const saldo = entrate - uscite;
  const savingsRate = entrate > 0 ? (saldo / entrate) * 100 : 0;

  const prevEntrate = sumByType(transactions, 'income', parseISO(prevFromISO), parseISO(prevToISO));
  const prevUscite = sumByType(transactions, 'expense', parseISO(prevFromISO), parseISO(prevToISO));
  const prevSaldo = prevEntrate - prevUscite;
  const prevSavingsRate = prevEntrate > 0 ? (prevSaldo / prevEntrate) * 100 : 0;

  const trend = useMemo(
    () => (granularity === 'day' ? buildDailyCashFlow(transactions, fromISO, toISO) : buildCustomRangeCashFlow(transactions, fromISO, toISO)),
    [transactions, fromISO, toISO, granularity]
  );

  const incomeBreakdown = useMemo(
    () => buildCategoryBreakdown(transactions, categories, 'income', fromISO, toISO),
    [transactions, categories, fromISO, toISO]
  );
  const expenseBreakdown = useMemo(
    () => buildCategoryBreakdown(transactions, categories, 'expense', fromISO, toISO),
    [transactions, categories, fromISO, toISO]
  );

  const topIncome = useMemo(
    () =>
      transactions
        .filter((t) => t.type === 'income' && t.date >= fromISO && t.date <= toISO)
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5),
    [transactions, fromISO, toISO]
  );
  const topExpense = useMemo(
    () =>
      transactions
        .filter((t) => t.type === 'expense' && t.date >= fromISO && t.date <= toISO)
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5),
    [transactions, fromISO, toISO]
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Analisi entrate e uscite</h1>
        <p className="text-sm text-slate-500">Analisi approfondita di tutti i movimenti, per categoria e nel tempo.</p>
      </div>

      <div className="card">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg overflow-hidden border border-slate-200 text-xs">
            {(['month', 'year', 'custom'] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 font-medium ${period === p ? 'bg-primary-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
              >
                {p === 'month' ? 'Mese' : p === 'year' ? 'Anno' : 'Personalizzato'}
              </button>
            ))}
          </div>

          {period === 'month' && (
            <input type="month" className="input !w-auto !py-1.5 text-sm" value={monthValue} max={monthInputValue(now)} onChange={(e) => setMonthValue(e.target.value)} />
          )}
          {period === 'year' && (
            <input
              type="number"
              className="input !w-24 !py-1.5 text-sm"
              value={yearValue}
              max={now.getFullYear()}
              onChange={(e) => setYearValue(Number(e.target.value) || now.getFullYear())}
            />
          )}
          {period === 'custom' && (
            <div className="flex items-center gap-1.5 text-sm">
              <input type="date" className="input !w-auto !py-1.5 text-sm" value={fromDate} max={toDate} onChange={(e) => setFromDate(e.target.value)} />
              <span className="text-slate-400">→</span>
              <input
                type="date"
                className="input !w-auto !py-1.5 text-sm"
                value={toDate}
                min={fromDate}
                max={dateInputValue(now)}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card min-w-0">
          <span className="text-xs text-slate-400 uppercase">Entrate</span>
          <div className="text-lg sm:text-xl font-semibold text-emerald-600 break-words">{formatCurrency(entrate)}</div>
          <DeltaBadge value={pctDelta(entrate, prevEntrate)} />
        </div>
        <div className="card min-w-0">
          <span className="text-xs text-slate-400 uppercase">Uscite</span>
          <div className="text-lg sm:text-xl font-semibold text-red-600 break-words">{formatCurrency(uscite)}</div>
          <DeltaBadge value={pctDelta(uscite, prevUscite)} invert />
        </div>
        <div className="card min-w-0">
          <span className="text-xs text-slate-400 uppercase">Saldo netto</span>
          <div className={`text-lg sm:text-xl font-semibold break-words ${saldo >= 0 ? 'text-slate-800' : 'text-red-600'}`}>
            {formatCurrency(saldo)}
          </div>
          <DeltaBadge value={pctDelta(saldo, prevSaldo)} />
        </div>
        <div className="card min-w-0">
          <span className="text-xs text-slate-400 uppercase">Tasso di risparmio</span>
          <div className="text-lg sm:text-xl font-semibold text-slate-800 break-words">{formatNumber(savingsRate, 1)}%</div>
          <DeltaBadge value={pctDelta(savingsRate, prevSavingsRate)} />
        </div>
      </div>

      <div className="card">
        <h3 className="text-sm font-semibold text-slate-700 mb-2">Andamento nel periodo</h3>
        <div className="h-64">
          {trend.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-16">Nessun dato nel periodo selezionato.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trend} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCurrency(v)} width={70} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="entrate" name="Entrate" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="uscite" name="Uscite" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="saldo" name="Saldo netto" stroke={accent} strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Entrate per categoria</h3>
          <CategoryBreakdownList items={incomeBreakdown} total={entrate} />
        </div>
        <div className="card">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Uscite per categoria</h3>
          <CategoryBreakdownList items={expenseBreakdown} total={uscite} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Entrate principali</h3>
          {topIncome.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">Nessuna entrata nel periodo.</p>
          ) : (
            <ul className="space-y-2">
              {topIncome.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex items-center gap-1.5 min-w-0">
                    <CategoryIconCircle category={categories.find((c) => c.id === t.categoryId)} />
                    <span className="min-w-0">
                      <span className="block text-slate-700 truncate">{t.description || '—'}</span>
                      <span className="block text-xs text-slate-400">{formatDate(t.date)}</span>
                    </span>
                  </span>
                  <span className="font-medium text-emerald-600 shrink-0">{formatCurrency(t.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Uscite principali</h3>
          {topExpense.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">Nessuna uscita nel periodo.</p>
          ) : (
            <ul className="space-y-2">
              {topExpense.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex items-center gap-1.5 min-w-0">
                    <CategoryIconCircle category={categories.find((c) => c.id === t.categoryId)} />
                    <span className="min-w-0">
                      <span className="block text-slate-700 truncate">{t.description || '—'}</span>
                      <span className="block text-xs text-slate-400">{formatDate(t.date)}</span>
                    </span>
                  </span>
                  <span className="font-medium text-red-600 shrink-0">{formatCurrency(t.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
