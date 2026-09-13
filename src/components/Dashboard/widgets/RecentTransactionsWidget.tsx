import { useMemo } from 'react';
import { useStore } from '../../../store/useStore';
import { getCategoryPath } from '../../../utils/ledger';
import { formatCurrency, formatDate } from '../../../utils/format';

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
    <table className="table-base">
      <thead>
        <tr>
          <th>Data</th>
          <th>Descrizione</th>
          <th>Categoria</th>
          <th className="text-right">Importo</th>
        </tr>
      </thead>
      <tbody>
        {recentTransactions.map((t) => (
          <tr key={t.id}>
            <td className="whitespace-nowrap">{formatDate(t.date)}</td>
            <td className="truncate max-w-[160px]">{t.description}</td>
            <td className="text-slate-500 truncate max-w-[140px]">{t.type === 'transfer' ? 'Giroconto' : getCategoryPath(t.categoryId, categories)}</td>
            <td
              className={`text-right font-medium whitespace-nowrap ${
                t.type === 'income' ? 'text-emerald-600' : t.type === 'expense' ? 'text-red-600' : 'text-blue-600'
              }`}
            >
              {t.type === 'income' ? '+' : t.type === 'expense' ? '-' : ''}
              {formatCurrency(t.amount)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
