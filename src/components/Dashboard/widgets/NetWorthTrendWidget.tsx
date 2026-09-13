import { useMemo } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useStore } from '../../../store/useStore';
import { computeAllHoldings } from '../../../utils/ledger';
import { buildNetWorthTrend } from '../../../utils/analytics';
import { formatCurrency } from '../../../utils/format';

export function NetWorthTrendWidget() {
  const accounts = useStore((s) => s.accounts);
  const transactions = useStore((s) => s.transactions);
  const investments = useStore((s) => s.investments);
  const investmentTransactions = useStore((s) => s.investmentTransactions);
  const patrimonioAssets = useStore((s) => s.patrimonioAssets);

  const holdings = useMemo(() => computeAllHoldings(investments, investmentTransactions), [investments, investmentTransactions]);
  const points = useMemo(
    () => buildNetWorthTrend(accounts, transactions, holdings, patrimonioAssets, 12),
    [accounts, transactions, holdings, patrimonioAssets]
  );

  const first = points[0]?.value ?? 0;
  const last = points[points.length - 1]?.value ?? 0;
  const delta = last - first;

  return (
    <div className="flex flex-col h-full gap-2">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>Ultimi 12 mesi</span>
        <span className={delta >= 0 ? 'text-emerald-600 font-medium' : 'text-red-600 font-medium'}>
          {delta >= 0 ? '+' : ''}
          {formatCurrency(delta)}
        </span>
      </div>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
            <defs>
              <linearGradient id="networthFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCurrency(v)} width={80} domain={['auto', 'auto']} />
            <Tooltip formatter={(v: number) => formatCurrency(v)} />
            <Area type="monotone" dataKey="value" name="Patrimonio netto" stroke="#6366f1" strokeWidth={2} fill="url(#networthFill)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[11px] text-slate-400">
        Investimenti e beni patrimoniali sono calcolati al valore attuale; l'andamento riflette soprattutto i flussi di
        cassa storici.
      </p>
    </div>
  );
}
