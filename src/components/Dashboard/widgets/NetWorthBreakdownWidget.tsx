import { useMemo } from 'react';
import { Wallet, TrendingUp, Building2, CreditCard } from 'lucide-react';
import { useStore } from '../../../store/useStore';
import { computeAllHoldings, computeNetWorth } from '../../../utils/ledger';
import { formatCurrency } from '../../../utils/format';
import { StatCard } from '../../common/StatCard';

export function NetWorthBreakdownWidget() {
  const accounts = useStore((s) => s.accounts);
  const transactions = useStore((s) => s.transactions);
  const investments = useStore((s) => s.investments);
  const investmentTransactions = useStore((s) => s.investmentTransactions);
  const patrimonioAssets = useStore((s) => s.patrimonioAssets);

  const holdings = useMemo(() => computeAllHoldings(investments, investmentTransactions), [investments, investmentTransactions]);
  const netWorth = useMemo(
    () => computeNetWorth(accounts, transactions, holdings, patrimonioAssets),
    [accounts, transactions, holdings, patrimonioAssets]
  );

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 h-full">
      <StatCard label="Liquidità" value={formatCurrency(netWorth.liquidita)} icon={<Wallet size={16} className="text-slate-400" />} />
      <StatCard
        label="Investimenti"
        value={formatCurrency(netWorth.investimenti)}
        icon={<TrendingUp size={16} className="text-slate-400" />}
      />
      <StatCard
        label="Beni al netto dei debiti"
        value={formatCurrency(netWorth.patrimonioImmobiliare)}
        icon={<Building2 size={16} className="text-slate-400" />}
      />
      <StatCard
        label="Debiti e carte"
        value={formatCurrency(netWorth.debiti)}
        tone="negative"
        icon={<CreditCard size={16} className="text-red-400" />}
      />
    </div>
  );
}
