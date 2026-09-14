import { useMemo, useState } from 'react';
import { endOfMonth, endOfYear, format, parseISO, startOfMonth, startOfYear, subDays } from 'date-fns';
import { ArrowDownRight, ArrowUpRight, ChevronDown, ChevronRight, Split } from 'lucide-react';
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useStore } from '../../store/useStore';
import {
  buildCategoryBreakdown,
  buildCustomRangeCashFlow,
  buildDailyCashFlow,
  buildNatureBreakdown,
  computeCashFlow,
  isInvestmentMovementCategory,
  pctDelta,
  type CategoryBreakdownItem,
  type NatureBreakdownItem,
} from '../../utils/analytics';
import { EXPENSE_NATURE_COLORS, EXPENSE_NATURE_LABELS } from '../../types';
import { formatCurrency, formatDate, formatNumber } from '../../utils/format';
import { getAccentColor } from '../../utils/theme';
import { round2 } from '../../utils/ledger';
import { CategoryIconCircle } from '../common/CategoryBadge';

const NATURE_LABELS: Record<NatureBreakdownItem['nature'], string> = {
  ...EXPENSE_NATURE_LABELS,
  non_classificata: 'Non classificata',
};
const NATURE_COLORS: Record<NatureBreakdownItem['nature'], string> = {
  ...EXPENSE_NATURE_COLORS,
  non_classificata: '#94a3b8',
};

type Period = 'month' | 'year' | 'custom';

function monthInputValue(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function dateInputValue(d: Date): string {
  return format(d, 'yyyy-MM-dd');
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

/** Variante compatta di DeltaBadge, per le singole voci di una lista (es. categorie). */
function MiniDelta({ value, invert = false }: { value: number | null; invert?: boolean }) {
  if (value === null) return null;
  const positive = invert ? value <= 0 : value >= 0;
  const Icon = value >= 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[11px] font-medium shrink-0 ${positive ? 'text-emerald-600' : 'text-red-600'}`}
      title="Rispetto al periodo precedente"
    >
      <Icon size={11} />
      {value >= 0 ? '+' : ''}
      {formatNumber(value, 0)}%
    </span>
  );
}

function CategoryBreakdownList({
  items,
  total,
  otherAmount = 0,
  previousAmounts,
  invert = false,
}: {
  items: CategoryBreakdownItem[];
  total: number;
  otherAmount?: number;
  /** Importo per categoria nel periodo precedente, per mostrare la variazione. */
  previousAmounts?: Map<string, number>;
  invert?: boolean;
}) {
  const accent = getAccentColor(useStore((s) => s.settings.colorTheme));
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setExpanded((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  if (items.length === 0 && otherAmount < 0.01) {
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
                <span className="flex items-center gap-1.5 shrink-0">
                  {previousAmounts && (
                    <MiniDelta value={pctDelta(item.amount, previousAmounts.get(item.category.id) ?? 0)} invert={invert} />
                  )}
                  <span className="text-right">
                    <span className="font-medium text-slate-700">{formatCurrency(item.amount)}</span>{' '}
                    <span className="text-xs text-slate-400">({formatNumber(item.pct, 0)}%)</span>
                  </span>
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
      {otherAmount >= 0.01 && (
        <li>
          <div className="flex items-center justify-between gap-2 text-sm mb-1">
            <span className="flex items-center gap-1.5 min-w-0 text-slate-500">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-slate-400 shrink-0">
                <ArrowUpRight size={12} />
              </span>
              <span className="truncate">Altri movimenti (verso/da conti non liquidi)</span>
            </span>
            <span className="text-right shrink-0 text-slate-500">{formatCurrency(otherAmount)}</span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-slate-300"
              style={{ width: `${total > 0 ? Math.min(100, (otherAmount / total) * 100) : 0}%` }}
            />
          </div>
        </li>
      )}
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
  const accounts = useStore((s) => s.accounts);
  const accent = getAccentColor(useStore((s) => s.settings.colorTheme));

  const [period, setPeriod] = useState<Period>('month');
  const [compareEnabled, setCompareEnabled] = useState(true);
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

  const { entrate, uscite } = computeCashFlow(transactions, accounts, parseISO(fromISO), parseISO(toISO));
  const saldo = entrate - uscite;
  const savingsRate = entrate > 0 ? (saldo / entrate) * 100 : 0;

  const { entrate: prevEntrate, uscite: prevUscite } = computeCashFlow(transactions, accounts, parseISO(prevFromISO), parseISO(prevToISO));
  const prevSaldo = prevEntrate - prevUscite;
  const prevSavingsRate = prevEntrate > 0 ? (prevSaldo / prevEntrate) * 100 : 0;

  const trend = useMemo(
    () =>
      granularity === 'day'
        ? buildDailyCashFlow(transactions, accounts, fromISO, toISO)
        : buildCustomRangeCashFlow(transactions, accounts, fromISO, toISO),
    [transactions, accounts, fromISO, toISO, granularity]
  );

  const prevTrend = useMemo(
    () =>
      !compareEnabled
        ? []
        : granularity === 'day'
        ? buildDailyCashFlow(transactions, accounts, prevFromISO, prevToISO)
        : buildCustomRangeCashFlow(transactions, accounts, prevFromISO, prevToISO),
    [transactions, accounts, prevFromISO, prevToISO, granularity, compareEnabled]
  );

  // Il periodo precedente viene sovrapposto al grafico allineando per indice (1° giorno/mese
  // del periodo corrente col 1° giorno/mese del precedente), non per data effettiva.
  const mergedTrend = useMemo(
    () =>
      trend.map((point, i) => ({
        ...point,
        entratePrec: prevTrend[i]?.entrate,
        uscitePrec: prevTrend[i]?.uscite,
        saldoPrec: prevTrend[i]?.saldo,
      })),
    [trend, prevTrend]
  );

  const incomeBreakdown = useMemo(
    () => buildCategoryBreakdown(transactions, categories, 'income', fromISO, toISO),
    [transactions, categories, fromISO, toISO]
  );
  const expenseBreakdown = useMemo(
    () => buildCategoryBreakdown(transactions, categories, 'expense', fromISO, toISO),
    [transactions, categories, fromISO, toISO]
  );

  const prevIncomeBreakdown = useMemo(
    () => (compareEnabled ? buildCategoryBreakdown(transactions, categories, 'income', prevFromISO, prevToISO) : []),
    [transactions, categories, prevFromISO, prevToISO, compareEnabled]
  );
  const prevExpenseBreakdown = useMemo(
    () => (compareEnabled ? buildCategoryBreakdown(transactions, categories, 'expense', prevFromISO, prevToISO) : []),
    [transactions, categories, prevFromISO, prevToISO, compareEnabled]
  );
  const prevIncomeByCategory = useMemo(
    () => new Map(prevIncomeBreakdown.map((i) => [i.category.id, i.amount])),
    [prevIncomeBreakdown]
  );
  const prevExpenseByCategory = useMemo(
    () => new Map(prevExpenseBreakdown.map((i) => [i.category.id, i.amount])),
    [prevExpenseBreakdown]
  );

  const natureBreakdown = useMemo(
    () => buildNatureBreakdown(transactions, categories, fromISO, toISO),
    [transactions, categories, fromISO, toISO]
  );
  const prevNatureBreakdown = useMemo(
    () => (compareEnabled ? buildNatureBreakdown(transactions, categories, prevFromISO, prevToISO) : []),
    [transactions, categories, prevFromISO, prevToISO, compareEnabled]
  );
  const prevNatureByKey = useMemo(
    () => new Map(prevNatureBreakdown.map((i) => [i.nature, i.amount])),
    [prevNatureBreakdown]
  );

  // Il flusso di cassa comprende anche i trasferimenti verso/da conti non liquidi (es.
  // versamenti su conto titoli, rate di un mutuo), che non hanno una categoria e quindi
  // non compaiono come voce nella scomposizione per categoria: qui si calcola la parte
  // residua, mostrata come riga a parte per far tornare i totali.
  const otherIncome = Math.max(0, round2(entrate - incomeBreakdown.reduce((s, i) => s + i.amount, 0)));
  const otherExpense = Math.max(0, round2(uscite - expenseBreakdown.reduce((s, i) => s + i.amount, 0)));

  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const topIncome = useMemo(
    () =>
      transactions
        .filter(
          (t) =>
            t.type === 'income' &&
            t.date >= fromISO &&
            t.date <= toISO &&
            !isInvestmentMovementCategory(t.categoryId ? categoryById.get(t.categoryId) : undefined)
        )
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5),
    [transactions, categoryById, fromISO, toISO]
  );
  const topExpense = useMemo(
    () =>
      transactions
        .filter(
          (t) =>
            t.type === 'expense' &&
            t.date >= fromISO &&
            t.date <= toISO &&
            !isInvestmentMovementCategory(t.categoryId ? categoryById.get(t.categoryId) : undefined)
        )
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5),
    [transactions, categoryById, fromISO, toISO]
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-800">Analisi entrate e uscite</h1>
        <p className="text-sm text-slate-500">
          Analisi approfondita di tutti i movimenti, per categoria e nel tempo, calcolata a flusso di cassa: conta
          quando il denaro entra o esce davvero dai conti di liquidità/conto corrente (comprese le uscite verso
          conti non liquidi, es. versamenti su conto titoli o rate di un mutuo), non quando un ricavo o un costo
          matura. Per il saldo economico per competenza vedi il Conto Economico nella pagina Bilancio.
        </p>
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

          <label className="flex items-center gap-1.5 text-sm text-slate-600 ml-auto">
            <input type="checkbox" checked={compareEnabled} onChange={(e) => setCompareEnabled(e.target.checked)} />
            Confronta con periodo precedente
          </label>
        </div>
        {compareEnabled && (
          <p className="text-xs text-slate-400 mt-2">
            Periodo di confronto: {formatDate(prevFromISO)} – {formatDate(prevToISO)}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card min-w-0">
          <span className="text-xs text-slate-400 uppercase">Entrate</span>
          <div className="text-lg sm:text-xl font-semibold text-emerald-600 break-words">{formatCurrency(entrate)}</div>
          {compareEnabled && (
            <>
              <DeltaBadge value={pctDelta(entrate, prevEntrate)} />
              <div className="text-[11px] text-slate-400 mt-0.5">Periodo prec.: {formatCurrency(prevEntrate)}</div>
            </>
          )}
        </div>
        <div className="card min-w-0">
          <span className="text-xs text-slate-400 uppercase">Uscite</span>
          <div className="text-lg sm:text-xl font-semibold text-red-600 break-words">{formatCurrency(uscite)}</div>
          {compareEnabled && (
            <>
              <DeltaBadge value={pctDelta(uscite, prevUscite)} invert />
              <div className="text-[11px] text-slate-400 mt-0.5">Periodo prec.: {formatCurrency(prevUscite)}</div>
            </>
          )}
        </div>
        <div className="card min-w-0">
          <span className="text-xs text-slate-400 uppercase">Saldo netto</span>
          <div className={`text-lg sm:text-xl font-semibold break-words ${saldo >= 0 ? 'text-slate-800' : 'text-red-600'}`}>
            {formatCurrency(saldo)}
          </div>
          {compareEnabled && (
            <>
              <DeltaBadge value={pctDelta(saldo, prevSaldo)} />
              <div className="text-[11px] text-slate-400 mt-0.5">Periodo prec.: {formatCurrency(prevSaldo)}</div>
            </>
          )}
        </div>
        <div className="card min-w-0">
          <span className="text-xs text-slate-400 uppercase">Tasso di risparmio</span>
          <div className="text-lg sm:text-xl font-semibold text-slate-800 break-words">{formatNumber(savingsRate, 1)}%</div>
          {compareEnabled && (
            <>
              <DeltaBadge value={pctDelta(savingsRate, prevSavingsRate)} />
              <div className="text-[11px] text-slate-400 mt-0.5">Periodo prec.: {formatNumber(prevSavingsRate, 1)}%</div>
            </>
          )}
        </div>
      </div>

      <div className="card">
        <h3 className="text-sm font-semibold text-slate-700 mb-2">
          Andamento nel periodo
          {compareEnabled && <span className="text-xs font-normal text-slate-400"> (tratteggio: periodo precedente)</span>}
        </h3>
        <div className="h-64">
          {mergedTrend.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-16">Nessun dato nel periodo selezionato.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={mergedTrend} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCurrency(v)} width={70} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="entrate" name="Entrate" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="uscite" name="Uscite" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="saldo" name="Saldo netto" stroke={accent} strokeWidth={2} dot={false} />
                {compareEnabled && (
                  <>
                    <Line
                      type="monotone"
                      dataKey="entratePrec"
                      name="Entrate periodo prec."
                      stroke="#10b981"
                      strokeWidth={1.5}
                      strokeDasharray="4 3"
                      strokeOpacity={0.6}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="uscitePrec"
                      name="Uscite periodo prec."
                      stroke="#ef4444"
                      strokeWidth={1.5}
                      strokeDasharray="4 3"
                      strokeOpacity={0.6}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="saldoPrec"
                      name="Saldo periodo prec."
                      stroke={accent}
                      strokeWidth={1.5}
                      strokeDasharray="4 3"
                      strokeOpacity={0.6}
                      dot={false}
                    />
                  </>
                )}
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="card">
        <h3 className="text-sm font-semibold text-slate-700 mb-1">Uscite per natura</h3>
        <p className="text-xs text-slate-400 mb-3">
          Quanto delle uscite è vincolato (obbligatorio/necessario) e quanto è discrezionale (extra), in base alla
          natura assegnata a ciascuna categoria (vedi pagina Categorie).
        </p>
        {natureBreakdown.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">Nessuna uscita nel periodo selezionato.</p>
        ) : (
          <>
            <div className="h-2.5 rounded-full overflow-hidden flex mb-3 bg-slate-100">
              {natureBreakdown.map((item) => (
                <div
                  key={item.nature}
                  style={{ width: `${item.pct}%`, backgroundColor: NATURE_COLORS[item.nature] }}
                  title={`${NATURE_LABELS[item.nature]}: ${formatNumber(item.pct, 0)}%`}
                />
              ))}
            </div>
            <ul className="space-y-2">
              {natureBreakdown.map((item) => (
                <li key={item.nature} className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: NATURE_COLORS[item.nature] }} />
                    <span className="truncate text-slate-700">{NATURE_LABELS[item.nature]}</span>
                  </span>
                  <span className="flex items-center gap-1.5 shrink-0">
                    {compareEnabled && (
                      <MiniDelta value={pctDelta(item.amount, prevNatureByKey.get(item.nature) ?? 0)} invert />
                    )}
                    <span className="text-right">
                      <span className="font-medium text-slate-700">{formatCurrency(item.amount)}</span>{' '}
                      <span className="text-xs text-slate-400">({formatNumber(item.pct, 0)}%)</span>
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Entrate per categoria</h3>
          <CategoryBreakdownList
            items={incomeBreakdown}
            total={entrate}
            otherAmount={otherIncome}
            previousAmounts={compareEnabled ? prevIncomeByCategory : undefined}
          />
        </div>
        <div className="card">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Uscite per categoria</h3>
          <CategoryBreakdownList
            items={expenseBreakdown}
            total={uscite}
            otherAmount={otherExpense}
            previousAmounts={compareEnabled ? prevExpenseByCategory : undefined}
            invert
          />
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
                    {t.splits && t.splits.length > 0 ? (
                      <span className="inline-flex items-center justify-center rounded-full bg-slate-100 text-slate-500 shrink-0 w-5 h-5">
                        <Split size={12} />
                      </span>
                    ) : (
                      <CategoryIconCircle category={categories.find((c) => c.id === t.categoryId)} />
                    )}
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
                    {t.splits && t.splits.length > 0 ? (
                      <span className="inline-flex items-center justify-center rounded-full bg-slate-100 text-slate-500 shrink-0 w-5 h-5">
                        <Split size={12} />
                      </span>
                    ) : (
                      <CategoryIconCircle category={categories.find((c) => c.id === t.categoryId)} />
                    )}
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
