import { useMemo } from 'react';
import { Area, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useStore } from '../../../store/useStore';
import { computeAllHoldings } from '../../../utils/ledger';
import { buildNetWorthTrend } from '../../../utils/analytics';
import { formatCurrency, formatNumber } from '../../../utils/format';

const SERIES_COLORS = {
  conti: '#0d9488',
  investimenti: '#f59e0b',
  asset: '#a78bfa',
  patrimonioNetto: '#111827',
};

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

  const first = points[0]?.patrimonioNetto ?? 0;
  const last = points[points.length - 1]?.patrimonioNetto ?? 0;
  const delta = last - first;
  const deltaPct = first !== 0 ? (delta / Math.abs(first)) * 100 : null;

  return (
    <div className="flex flex-col h-full gap-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xl font-extrabold text-slate-800 truncate">{formatCurrency(last)}</div>
          <div className={`text-xs font-medium ${delta >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {delta >= 0 ? '+' : ''}
            {formatCurrency(delta)}
            {deltaPct !== null && ` (${delta >= 0 ? '+' : ''}${formatNumber(deltaPct, 1)}%)`}
          </div>
        </div>
        <span className="text-xs text-slate-400 shrink-0">Ultimi 12 mesi</span>
      </div>

      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={points} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCurrency(v)} width={80} domain={['auto', 'auto']} />
            <Tooltip formatter={(v: number) => formatCurrency(v)} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Area
              type="monotone"
              dataKey="conti"
              name="Conti"
              stackId="patrimonio"
              stroke={SERIES_COLORS.conti}
              fill={SERIES_COLORS.conti}
              fillOpacity={0.55}
            />
            <Area
              type="monotone"
              dataKey="investimenti"
              name="Investimenti"
              stackId="patrimonio"
              stroke={SERIES_COLORS.investimenti}
              fill={SERIES_COLORS.investimenti}
              fillOpacity={0.55}
            />
            <Area
              type="monotone"
              dataKey="asset"
              name="Asset"
              stackId="patrimonio"
              stroke={SERIES_COLORS.asset}
              fill={SERIES_COLORS.asset}
              fillOpacity={0.55}
            />
            <Line
              type="monotone"
              dataKey="patrimonioNetto"
              name="Patrimonio netto"
              stroke={SERIES_COLORS.patrimonioNetto}
              strokeWidth={2}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <p className="text-[11px] text-slate-400">
        La linea del patrimonio netto è al netto dei debiti (conti passivi e finanziamenti). Investimenti e beni
        patrimoniali sono calcolati al valore attuale.
      </p>
    </div>
  );
}
