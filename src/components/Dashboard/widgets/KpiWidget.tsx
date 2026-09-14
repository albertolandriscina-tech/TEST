import { TrendingUp, TrendingDown, Scale, Wallet } from 'lucide-react';
import { useStore } from '../../../store/useStore';
import { computeAllHoldings, computeNetWorth } from '../../../utils/ledger';
import { computeCashFlow } from '../../../utils/analytics';
import { formatCurrency } from '../../../utils/format';
import { dashboardPeriodLabel } from '../../../utils/period';
import { useDashboardPeriod } from '../DashboardPeriodContext';
import { StatCard } from '../../common/StatCard';
import { useMemo } from 'react';

export function KpiWidget() {
  const accounts = useStore((s) => s.accounts);
  const transactions = useStore((s) => s.transactions);
  const investments = useStore((s) => s.investments);
  const investmentTransactions = useStore((s) => s.investmentTransactions);
  const patrimonioAssets = useStore((s) => s.patrimonioAssets);
  const period = useDashboardPeriod();

  const { entrate: periodIncome, uscite: periodExpense } = useMemo(
    () => computeCashFlow(transactions, accounts, period.start, period.end),
    [transactions, accounts, period]
  );

  const holdings = useMemo(() => computeAllHoldings(investments, investmentTransactions), [investments, investmentTransactions]);
  const netWorth = useMemo(
    () => computeNetWorth(accounts, transactions, holdings, patrimonioAssets),
    [accounts, transactions, holdings, patrimonioAssets]
  );

  return (
    <div className="flex flex-col h-full gap-1.5">
      <p className="text-xs text-slate-400 shrink-0">{dashboardPeriodLabel(period)}</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-1">
        <StatCard label="Entrate" value={formatCurrency(periodIncome)} tone="positive" icon={<TrendingUp size={16} className="text-emerald-500" />} />
        <StatCard label="Uscite" value={formatCurrency(periodExpense)} tone="negative" icon={<TrendingDown size={16} className="text-red-500" />} />
        <StatCard
          label="Saldo"
          value={formatCurrency(periodIncome - periodExpense)}
          tone={periodIncome - periodExpense >= 0 ? 'positive' : 'negative'}
          icon={<Scale size={16} className="text-primary-500" />}
        />
        <StatCard label="Patrimonio netto" value={formatCurrency(netWorth.patrimonioNetto)} tone="accent" icon={<Wallet size={16} className="text-primary-500" />} />
      </div>
    </div>
  );
}
