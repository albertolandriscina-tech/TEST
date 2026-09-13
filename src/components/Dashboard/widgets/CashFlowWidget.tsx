import { useMemo, useState } from 'react';
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useStore } from '../../../store/useStore';
import { buildCustomRangeCashFlow, buildMonthlyCashFlow, buildYearlyCashFlow } from '../../../utils/analytics';
import { formatCurrency } from '../../../utils/format';
import { getAccentColor } from '../../../utils/theme';

type Period = 'month' | 'year' | 'custom';

function monthInputValue(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function CashFlowWidget() {
  const transactions = useStore((s) => s.transactions);
  const accent = getAccentColor(useStore((s) => s.settings.colorTheme));
  const [period, setPeriod] = useState<Period>('month');

  const now = new Date();
  const defaultFrom = monthInputValue(new Date(now.getFullYear(), now.getMonth() - 5, 1));
  const defaultTo = monthInputValue(now);
  const [fromMonth, setFromMonth] = useState(defaultFrom);
  const [toMonth, setToMonth] = useState(defaultTo);

  const buckets = useMemo(() => {
    if (period === 'month') return buildMonthlyCashFlow(transactions, 12);
    if (period === 'year') return buildYearlyCashFlow(transactions, 5);
    return buildCustomRangeCashFlow(transactions, `${fromMonth}-01`, `${toMonth}-01`);
  }, [transactions, period, fromMonth, toMonth]);

  const totalEntrate = buckets.reduce((s, b) => s + b.entrate, 0);
  const totalUscite = buckets.reduce((s, b) => s + b.uscite, 0);

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
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span>
            Entrate <strong className="text-emerald-600">{formatCurrency(totalEntrate)}</strong>
          </span>
          <span>
            Uscite <strong className="text-red-600">{formatCurrency(totalUscite)}</strong>
          </span>
          <span>
            Netto{' '}
            <strong className={totalEntrate - totalUscite >= 0 ? 'text-emerald-600' : 'text-red-600'}>
              {formatCurrency(totalEntrate - totalUscite)}
            </strong>
          </span>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        {buckets.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-10">Nessun dato nel periodo selezionato.</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={buckets} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
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
  );
}
