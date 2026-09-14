import { useMemo } from 'react';
import { ArrowRightLeft, Split } from 'lucide-react';
import { useStore } from '../../../store/useStore';
import { formatCurrency, formatDate } from '../../../utils/format';
import { isSplitTransaction } from '../../../utils/ledger';
import { CategoryIconCircle } from '../../common/CategoryBadge';

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
      {recentTransactions.map((t) => {
        const category = t.categoryId ? categories.find((c) => c.id === t.categoryId) : null;
        const split = isSplitTransaction(t);
        return (
          <li key={t.id} className="flex items-center gap-2 py-1.5 border-b border-slate-50 last:border-0">
            {t.type === 'transfer' ? (
              <span className="inline-flex items-center justify-center rounded-full bg-blue-50 text-blue-600 shrink-0 w-5 h-5">
                <ArrowRightLeft size={12} />
              </span>
            ) : split ? (
              <span className="inline-flex items-center justify-center rounded-full bg-slate-100 text-slate-500 shrink-0 w-5 h-5">
                <Split size={12} />
              </span>
            ) : (
              <CategoryIconCircle category={category} />
            )}
            <div className="min-w-0 flex-1">
              <div className="text-sm text-slate-700 truncate">{t.description}</div>
              <div className="text-xs text-slate-400 truncate">
                {formatDate(t.date)} ·{' '}
                {t.type === 'transfer' ? 'Giroconto' : split ? `${t.splits!.length} categorie` : category?.name ?? 'Senza categoria'}
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
        );
      })}
    </ul>
  );
}
