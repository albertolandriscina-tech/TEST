import { useMemo } from 'react';
import { ArrowDownCircle, ArrowRightLeft, ArrowUpCircle } from 'lucide-react';
import { useStore } from '../../../store/useStore';
import { getCategoryPath } from '../../../utils/ledger';
import { formatCurrency, formatDate } from '../../../utils/format';
import type { TransactionType } from '../../../types';

const typeIcon: Record<TransactionType, JSX.Element> = {
  income: <ArrowUpCircle size={16} className="text-emerald-600 shrink-0" />,
  expense: <ArrowDownCircle size={16} className="text-red-600 shrink-0" />,
  transfer: <ArrowRightLeft size={16} className="text-blue-600 shrink-0" />,
};

export function RecentTransactionsWidget() {
  const transactions = useStore((s) => s.transactions);
  const categories = useStore((s) => s.categories);

  const recentTransactions = useMemo(
    () => [...transactions].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)).slice(0, 10),
    [transactions]
  );

  if (recentTransactions.length === 0) {
    return <p className="text-sm text-slate-400 text-center py-6">Nessun movimento registrato.</p>;
  }

  return (
    <ul className="space-y-1">
      {recentTransactions.map((t) => (
        <li key={t.id} className="flex items-center gap-2 py-1.5 border-b border-slate-50 last:border-0">
          {typeIcon[t.type]}
          <div className="min-w-0 flex-1">
            <div className="text-sm text-slate-700 truncate">{t.description}</div>
            <div className="text-xs text-slate-400 truncate">
              {formatDate(t.date)} · {t.type === 'transfer' ? 'Giroconto' : getCategoryPath(t.categoryId, categories)}
            </div>
          </div>
          <span
            className={`text-sm font-medium whitespace-nowrap shrink-0 ${
              t.type === 'income' ? 'text-emerald-600' : t.type === 'expense' ? 'text-red-600' : 'text-blue-600'
            }`}
          >
            {t.type === 'income' ? '+' : t.type === 'expense' ? '-' : ''}
            {formatCurrency(t.amount)}
          </span>
        </li>
      ))}
    </ul>
  );
}
