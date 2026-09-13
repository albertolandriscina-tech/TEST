import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { InvestmentHolding } from '../../utils/ledger';
import type { InvestmentType, PortfolioSnapshot } from '../../types';
import { INVESTMENT_TYPE_LABELS } from '../../types';
import { formatCurrency, formatDate, formatNumber } from '../../utils/format';

const TYPE_COLORS: Record<InvestmentType, string> = {
  etf: '#6366f1',
  fund: '#0ea5e9',
  stock: '#f59e0b',
  bond: '#14b8a6',
};

interface Props {
  holdings: InvestmentHolding[];
  snapshots: PortfolioSnapshot[];
}

export function PortfolioAnalysis({ holdings, snapshots }: Props) {
  const totalValue = holdings.reduce((s, h) => s + h.currentValue, 0);

  const allocationByType = useMemo(() => {
    const map = new Map<InvestmentType, number>();
    for (const h of holdings) {
      map.set(h.investment.type, (map.get(h.investment.type) ?? 0) + h.currentValue);
    }
    return Array.from(map.entries())
      .map(([type, value]) => ({ type, value, pct: totalValue > 0 ? (value / totalValue) * 100 : 0 }))
      .sort((a, b) => b.value - a.value);
  }, [holdings, totalValue]);

  const ranking = useMemo(
    () =>
      [...holdings]
        .map((h) => ({ ...h, weight: totalValue > 0 ? (h.currentValue / totalValue) * 100 : 0 }))
        .sort((a, b) => b.gainLossPct - a.gainLossPct),
    [holdings, totalValue]
  );

  const trend = useMemo(
    () =>
      [...snapshots]
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((s) => ({ ...s, gain: s.totalValue - s.totalCost, label: formatDate(s.date).slice(0, 5) })),
    [snapshots]
  );

  const topHolding = ranking.length > 0 ? [...ranking].sort((a, b) => b.weight - a.weight)[0] : null;
  const bestPerformer = ranking[0] ?? null;
  const worstPerformer = ranking[ranking.length - 1] ?? null;

  if (holdings.length === 0) {
    return <div className="card text-center text-slate-400 py-6">Aggiungi almeno uno strumento per vedere l'analisi del portafoglio.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="card">
          <span className="text-xs text-slate-400 uppercase">Strumento con peso maggiore</span>
          {topHolding && (
            <>
              <div className="text-base font-semibold text-slate-800 truncate">{topHolding.investment.name}</div>
              <div className="text-sm text-slate-500">{formatNumber(topHolding.weight, 1)}% del portafoglio</div>
            </>
          )}
        </div>
        <div className="card">
          <span className="text-xs text-slate-400 uppercase">Migliore performance</span>
          {bestPerformer && (
            <>
              <div className="text-base font-semibold text-slate-800 truncate">{bestPerformer.investment.name}</div>
              <div className="text-sm text-emerald-600 font-medium">
                +{formatNumber(bestPerformer.gainLossPct, 1)}%
              </div>
            </>
          )}
        </div>
        <div className="card">
          <span className="text-xs text-slate-400 uppercase">Peggiore performance</span>
          {worstPerformer && (
            <>
              <div className="text-base font-semibold text-slate-800 truncate">{worstPerformer.investment.name}</div>
              <div className={`text-sm font-medium ${worstPerformer.gainLossPct >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {worstPerformer.gainLossPct >= 0 ? '+' : ''}
                {formatNumber(worstPerformer.gainLossPct, 1)}%
              </div>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="text-sm font-semibold text-slate-700 mb-2">Allocazione per tipologia</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={allocationByType}
                  dataKey="value"
                  nameKey="type"
                  innerRadius="55%"
                  outerRadius="85%"
                  paddingAngle={2}
                >
                  {allocationByType.map((entry) => (
                    <Cell key={entry.type} fill={TYPE_COLORS[entry.type]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: number, _n, item: { payload?: { type: InvestmentType } }) => [
                    formatCurrency(v),
                    item.payload ? INVESTMENT_TYPE_LABELS[item.payload.type] : '',
                  ]}
                />
                <Legend
                  formatter={(_v, entry) => {
                    const p = entry?.payload as unknown as { type: InvestmentType; pct: number } | undefined;
                    return p ? `${INVESTMENT_TYPE_LABELS[p.type]} (${formatNumber(p.pct, 0)}%)` : '';
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h3 className="text-sm font-semibold text-slate-700 mb-2">Andamento capitale investito vs valore</h3>
          <div className="h-64">
            {trend.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="portfolioValueFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCurrency(v)} width={80} domain={['auto', 'auto']} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Area type="monotone" dataKey="totalCost" name="Capitale investito" stroke="#94a3b8" strokeWidth={2} fill="none" />
                  <Area
                    type="monotone"
                    dataKey="totalValue"
                    name="Valore di mercato"
                    stroke="#6366f1"
                    strokeWidth={2}
                    fill="url(#portfolioValueFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-slate-400 text-center py-16">
                Usa "Aggiorna quotazioni" nel tempo per costruire lo storico del portafoglio.
              </p>
            )}
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-2">Classifica performance per strumento</h3>

        {/* Vista a card: sotto sm */}
        <div className="sm:hidden space-y-2">
          {ranking.map((h, idx) => (
            <div key={h.investment.id} className="card">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs text-slate-400">#{idx + 1}</div>
                  <div className="font-medium text-slate-700 truncate">{h.investment.name}</div>
                  <div className="text-xs text-slate-400">{INVESTMENT_TYPE_LABELS[h.investment.type]}</div>
                </div>
                <div className={`text-sm font-semibold shrink-0 ${h.gainLoss >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {h.gainLoss >= 0 ? '+' : ''}
                  {formatNumber(h.gainLossPct, 1)}%
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-2 text-sm">
                <div>
                  <div className="text-xs text-slate-400">Peso</div>
                  <div>{formatNumber(h.weight, 1)}%</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Investito</div>
                  <div>{formatCurrency(h.costBasis)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Valore</div>
                  <div className="font-medium">{formatCurrency(h.currentValue)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Vista a tabella: da sm in su */}
        <div className="hidden sm:block card !p-0 overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>#</th>
                <th>Strumento</th>
                <th className="text-right">Peso</th>
                <th className="text-right">Investito</th>
                <th className="text-right">Valore</th>
                <th className="text-right">Rendimento</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((h, idx) => (
                <tr key={h.investment.id}>
                  <td className="text-slate-400">{idx + 1}</td>
                  <td>
                    <div className="font-medium text-slate-700">{h.investment.name}</div>
                    <div className="text-xs text-slate-400">{INVESTMENT_TYPE_LABELS[h.investment.type]}</div>
                  </td>
                  <td className="text-right">{formatNumber(h.weight, 1)}%</td>
                  <td className="text-right">{formatCurrency(h.costBasis)}</td>
                  <td className="text-right">{formatCurrency(h.currentValue)}</td>
                  <td className={`text-right font-medium ${h.gainLoss >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {h.gainLoss >= 0 ? '+' : ''}
                    {formatNumber(h.gainLossPct, 1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
