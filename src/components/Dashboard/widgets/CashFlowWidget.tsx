import { useMemo, useState } from 'react';
import { endOfMonth, endOfYear, parseISO, startOfMonth, startOfYear, subMonths, subYears } from 'date-fns';
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useStore } from '../../../store/useStore';
import {
  buildCustomRangeCashFlow,
  buildLiquidityTrend,
  buildMonthlyCashFlow,
  buildYearlyCashFlow,
  computeCashFlowByActivity,
} from '../../../utils/analytics';
import { formatCurrency } from '../../../utils/format';
import { getAccentColor } from '../../../utils/theme';
import { StatCard } from '../../common/StatCard';

type Period = 'month' | 'year' | 'custom';

const MONTH_COUNT_OPTIONS = [3, 6, 12, 24];
const YEAR_COUNT_OPTIONS = [3, 5, 10];

function monthInputValue(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function CashFlowWidget() {
  const transactions = useStore((s) => s.transactions);
  const accounts = useStore((s) => s.accounts);
  const accent = getAccentColor(useStore((s) => s.settings.colorTheme));
  const [period, setPeriod] = useState<Period>('month');
  const [monthCount, setMonthCount] = useState(12);
  const [yearCount, setYearCount] = useState(5);

  const now = new Date();
  const defaultFrom = monthInputValue(new Date(now.getFullYear(), now.getMonth() - 5, 1));
  const defaultTo = monthInputValue(now);
  const [fromMonth, setFromMonth] = useState(defaultFrom);
  const [toMonth, setToMonth] = useState(defaultTo);

  const { buckets, rangeFrom, rangeTo } = useMemo(() => {
    if (period === 'month') {
      return {
        buckets: buildMonthlyCashFlow(transactions, accounts, monthCount),
        rangeFrom: startOfMonth(subMonths(now, monthCount - 1)),
        rangeTo: endOfMonth(now),
      };
    }
    if (period === 'year') {
      return {
        buckets: buildYearlyCashFlow(transactions, accounts, yearCount),
        rangeFrom: startOfYear(subYears(now, yearCount - 1)),
        rangeTo: endOfYear(now),
      };
    }
    return {
      buckets: buildCustomRangeCashFlow(transactions, accounts, `${fromMonth}-01`, `${toMonth}-01`),
      rangeFrom: startOfMonth(parseISO(`${fromMonth}-01`)),
      rangeTo: endOfMonth(parseISO(`${toMonth}-01`)),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, accounts, period, monthCount, yearCount, fromMonth, toMonth]);

  const liquidityTrend = useMemo(() => buildLiquidityTrend(transactions, accounts, buckets), [transactions, accounts, buckets]);
  const chartData = useMemo(
    () => buckets.map((b, i) => ({ ...b, liquidita: liquidityTrend[i] })),
    [buckets, liquidityTrend]
  );

  const activity = useMemo(
    () => computeCashFlowByActivity(transactions, accounts, rangeFrom, rangeTo),
    [transactions, accounts, rangeFrom, rangeTo]
  );

  const totalEntrate = buckets.reduce((s, b) => s + b.entrate, 0);
  const totalUscite = buckets.reduce((s, b) => s + b.uscite, 0);
  const flussoNetto = totalEntrate - totalUscite;
  const liquiditaFinale = liquidityTrend[liquidityTrend.length - 1] ?? 0;
  const flussoMedio = buckets.length > 0 ? flussoNetto / buckets.length : 0;

  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex rounded-lg overflow-hidden border border-slate-200 text-xs">
          {(['month', 'year', 'custom'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-2.5 py-1 font-medium ${period === p ? 'bg-primary-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
            >
              {p === 'month' ? 'Mensile' : p === 'year' ? 'Annuale' : 'Personalizzato'}
            </button>
          ))}
        </div>
        {period === 'month' && (
          <select className="input !py-1 !px-2 !w-auto text-xs" value={monthCount} onChange={(e) => setMonthCount(Number(e.target.value))}>
            {MONTH_COUNT_OPTIONS.map((n) => (
              <option key={n} value={n}>
                Ultimi {n} mesi
              </option>
            ))}
          </select>
        )}
        {period === 'year' && (
          <select className="input !py-1 !px-2 !w-auto text-xs" value={yearCount} onChange={(e) => setYearCount(Number(e.target.value))}>
            {YEAR_COUNT_OPTIONS.map((n) => (
              <option key={n} value={n}>
                Ultimi {n} anni
              </option>
            ))}
          </select>
        )}
        {period === 'custom' && (
          <div className="flex items-center gap-1.5 text-xs">
            <input
              type="month"
              className="input !py-1 !px-2 !w-auto text-xs"
              value={fromMonth}
              max={toMonth}
              onChange={(e) => setFromMonth(e.target.value)}
            />
            <span className="text-slate-400">→</span>
            <input
              type="month"
              className="input !py-1 !px-2 !w-auto text-xs"
              value={toMonth}
              min={fromMonth}
              max={monthInputValue(new Date())}
              onChange={(e) => setToMonth(e.target.value)}
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 shrink-0">
        <StatCard label="Incassi del periodo" value={formatCurrency(totalEntrate)} tone="positive" />
        <StatCard label="Pagamenti del periodo" value={formatCurrency(totalUscite)} tone="negative" />
        <StatCard label="Flusso netto" value={formatCurrency(flussoNetto)} />
        <StatCard label="Liquidità finale" value={formatCurrency(liquiditaFinale)} tone="accent" />
      </div>

      <div className="flex-1 min-h-0">
        {chartData.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-10">Nessun dato nel periodo selezionato.</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCurrency(v)} width={70} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="entrate" name="Incassi" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="uscite" name="Pagamenti" fill="#ef4444" radius={[4, 4, 0, 0]} />
              <Line type="monotone" dataKey="saldo" name="Flusso netto" stroke={accent} strokeWidth={2} dot={{ r: 3 }} />
              <Line
                type="monotone"
                dataKey="liquidita"
                name="Liquidità"
                stroke="#64748b"
                strokeWidth={1.5}
                strokeDasharray="5 4"
                dot={{ r: 2 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 border-t border-slate-100 pt-2 shrink-0 text-sm">
        <div className="flex items-center justify-between sm:block sm:px-3 first:sm:pl-0 py-1">
          <span className="text-slate-400">Gestione operativa</span>
          <span className="font-medium text-slate-700 sm:float-right">{formatCurrency(activity.operativa)}</span>
        </div>
        <div className="flex items-center justify-between sm:block sm:px-3 py-1">
          <span className="text-slate-400">Investimenti</span>
          <span className="font-medium text-slate-700 sm:float-right">{formatCurrency(activity.investimenti)}</span>
        </div>
        <div className="flex items-center justify-between sm:block sm:px-3 last:sm:pr-0 py-1">
          <span className="text-slate-400">Finanziamenti e capitale</span>
          <span className="font-medium text-slate-700 sm:float-right">{formatCurrency(activity.finanziamenti)}</span>
        </div>
      </div>
      <p className="text-xs text-slate-400 shrink-0">Flusso medio per periodo: {formatCurrency(flussoMedio)}</p>
    </div>
  );
}
