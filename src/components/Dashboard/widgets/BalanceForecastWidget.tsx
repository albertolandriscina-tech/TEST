import { useMemo, useState } from 'react';
import { Area, CartesianGrid, ComposedChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useStore } from '../../../store/useStore';
import { buildBalanceForecast } from '../../../utils/analytics';
import { formatCurrency } from '../../../utils/format';
import { getAccentColor } from '../../../utils/theme';
import { StatCard } from '../../common/StatCard';

const MONTH_COUNT_OPTIONS = [3, 6, 12];

export function BalanceForecastWidget() {
  const accounts = useStore((s) => s.accounts);
  const transactions = useStore((s) => s.transactions);
  const recurringTransactions = useStore((s) => s.recurringTransactions);
  const accent = getAccentColor(useStore((s) => s.settings.colorTheme));
  const [monthsAhead, setMonthsAhead] = useState(6);

  const activeRecurringCount = useMemo(
    () => recurringTransactions.filter((r) => r.active && r.type !== 'transfer').length,
    [recurringTransactions]
  );

  const { points, projectedIncome, projectedExpense } = useMemo(
    () => buildBalanceForecast(accounts, transactions, recurringTransactions, monthsAhead),
    [accounts, transactions, recurringTransactions, monthsAhead]
  );

  const current = points[0]?.total ?? 0;
  const projected = points[points.length - 1]?.total ?? 0;
  const delta = projected - current;

  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-400">
          Proiezione basata sui {activeRecurringCount} movimenti ricorrenti/programmati attivi (entrate e uscite), oltre al
          saldo attuale dei conti.
        </p>
        <select
          className="input !py-1 !px-2 !w-auto text-xs shrink-0"
          value={monthsAhead}
          onChange={(e) => setMonthsAhead(Number(e.target.value))}
        >
          {MONTH_COUNT_OPTIONS.map((n) => (
            <option key={n} value={n}>
              Prossimi {n} mesi
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 shrink-0">
        <StatCard label="Saldo attuale" value={formatCurrency(current)} />
        <StatCard label="Entrate previste" value={formatCurrency(projectedIncome)} tone="positive" />
        <StatCard label="Uscite previste" value={formatCurrency(projectedExpense)} tone="negative" />
        <StatCard
          label={`Saldo previsto (${monthsAhead} mesi)`}
          value={formatCurrency(projected)}
          tone={delta >= 0 ? 'positive' : 'negative'}
          sub={`${delta >= 0 ? '+' : ''}${formatCurrency(delta)} vs oggi`}
        />
      </div>

      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={points} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
            <defs>
              <linearGradient id="balanceForecastFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={accent} stopOpacity={0.3} />
                <stop offset="95%" stopColor={accent} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCurrency(v)} width={70} />
            <Tooltip formatter={(v: number) => formatCurrency(v)} />
            <ReferenceLine y={0} stroke="#cbd5e1" />
            <Area
              type="monotone"
              dataKey="total"
              name="Saldo proiettato"
              stroke={accent}
              strokeWidth={2}
              fill="url(#balanceForecastFill)"
              dot={{ r: 3 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-slate-400 shrink-0">
        Dal primo punto in poi la linea è una stima: somma il saldo attuale alle entrate e uscite dei movimenti
        ricorrenti/programmati ancora da avvenire, senza considerare investimenti o beni patrimoniali.
      </p>
    </div>
  );
}
