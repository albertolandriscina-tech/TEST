import { TrendingUp, TrendingDown, Scale, Wallet } from 'lucide-react';
import { endOfMonth, startOfMonth } from 'date-fns';
import { useStore } from '../../../store/useStore';
import { computeAllHoldings, computeNetWorth } from '../../../utils/ledger';
import { computeCashFlow } from '../../../utils/analytics';
import { formatCurrency } from '../../../utils/format';
import { StatCard } from '../../common/StatCard';
import { useMemo } from 'react';

export function KpiWidget() {
  const accounts = useStore((s) => s.accounts);
  const transactions = useStore((s) => s.transactions);
  const investments = useStore((s) => s.investments);
  const investmentTransactions = useStore((s) => s.investmentTransactions);
  const patrimonioAssets = useStore((s) => s.patrimonioAssets);

  const now = new Date();
  const { entrate: currentMonthIncome, uscite: currentMonthExpense } = useMemo(
    () => computeCashFlow(transactions, accounts, startOfMonth(now), endOfMonth(now)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [transactions, accounts]
  );

  const holdings = useMemo(() => computeAllHoldings(investments, investmentTransactions), [investments, investmentTransactions]);
  const netWorth = useMemo(
    () => computeNetWorth(accounts, transactions, holdings, patrimonioAssets),
    [accounts, transactions, holdings, patrimonioAssets]
  );

  return (
    <div className="grid grid-cols-2 gap-3 h-full">
      <StatCard label="Entrate (mese)" value={formatCurrency(currentMonthIncome)} tone="positive" icon={<TrendingUp size={16} className="text-emerald-500" />} />
      <StatCard label="Uscite (mese)" value={formatCurrency(currentMonthExpense)} tone="negative" icon={<TrendingDown size={16} className="text-red-500" />} />
      <StatCard
        label="Saldo (mese)"
        value={formatCurrency(currentMonthIncome - currentMonthExpense)}
        tone={currentMonthIncome - currentMonthExpense >= 0 ? 'positive' : 'negative'}
        icon={<Scale size={16} className="text-primary-500" />}
      />
      <StatCard label="Patrimonio netto" value={formatCurrency(netWorth.patrimonioNetto)} tone="accent" icon={<Wallet size={16} className="text-primary-500" />} />
    </div>
  );
}
