import { useMemo } from 'react';
import { Landmark, Wallet, TrendingUp, CreditCard, PiggyBank } from 'lucide-react';
import { useStore } from '../../../store/useStore';
import { computeAllAccountBalances } from '../../../utils/ledger';
import { formatCurrency } from '../../../utils/format';
import type { AccountType } from '../../../types';

const ICONS: Record<AccountType, JSX.Element> = {
  bank: <Landmark size={15} className="text-primary-500" />,
  cash: <Wallet size={15} className="text-emerald-500" />,
  investment: <TrendingUp size={15} className="text-blue-500" />,
  credit_card: <CreditCard size={15} className="text-red-500" />,
  other: <PiggyBank size={15} className="text-slate-400" />,
};

export function AccountsBalanceWidget() {
  const accounts = useStore((s) => s.accounts.filter((a) => !a.archived));
  const transactions = useStore((s) => s.transactions);

  const balances = useMemo(() => computeAllAccountBalances(accounts, transactions), [accounts, transactions]);
  const total = accounts.reduce((s, a) => s + (balances[a.id] ?? 0), 0);

  if (accounts.length === 0) {
    return <p className="text-sm text-slate-400 text-center py-6">Nessun conto. Aggiungine uno nella pagina Conti.</p>;
  }

  return (
    <div className="flex flex-col h-full">
      <ul className="space-y-1 flex-1">
        {accounts.map((a) => {
          const bal = balances[a.id] ?? 0;
          return (
            <li key={a.id} className="flex items-center justify-between gap-2 px-1 py-1.5 rounded-lg hover:bg-slate-50">
              <span className="flex items-center gap-2 min-w-0 text-sm text-slate-600">
                {ICONS[a.type]}
                <span className="truncate">{a.name}</span>
              </span>
              <span className={`text-sm font-semibold whitespace-nowrap ${bal >= 0 ? 'text-slate-700' : 'text-red-600'}`}>
                {formatCurrency(bal, a.currency)}
              </span>
            </li>
          );
        })}
      </ul>
      <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-100 text-sm font-semibold">
        <span className="text-slate-500">Totale</span>
        <span className={total >= 0 ? 'text-emerald-600' : 'text-red-600'}>{formatCurrency(total)}</span>
      </div>
    </div>
  );
}
