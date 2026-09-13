import { useMemo } from 'react';
import { endOfMonth, format, startOfMonth } from 'date-fns';
import { useStore } from '../../../store/useStore';
import { buildNatureBreakdown, type NatureBreakdownItem } from '../../../utils/analytics';
import { EXPENSE_NATURE_COLORS, EXPENSE_NATURE_LABELS } from '../../../types';
import { formatCurrency, formatNumber } from '../../../utils/format';

const NATURE_LABELS: Record<NatureBreakdownItem['nature'], string> = {
  ...EXPENSE_NATURE_LABELS,
  non_classificata: 'Non classificata',
};
const NATURE_COLORS: Record<NatureBreakdownItem['nature'], string> = {
  ...EXPENSE_NATURE_COLORS,
  non_classificata: '#94a3b8',
};

export function ExpenseNatureWidget() {
  const transactions = useStore((s) => s.transactions);
  const categories = useStore((s) => s.categories);

  const now = new Date();
  const fromISO = format(startOfMonth(now), 'yyyy-MM-dd');
  const toISO = format(endOfMonth(now), 'yyyy-MM-dd');

  const breakdown = useMemo(
    () => buildNatureBreakdown(transactions, categories, fromISO, toISO),
    [transactions, categories, fromISO, toISO]
  );

  if (breakdown.length === 0) {
    return <p className="text-sm text-slate-400 text-center py-10">Nessuna spesa registrata questo mese.</p>;
  }

  return (
    <div className="h-full flex flex-col justify-center gap-3">
      <div className="h-3 rounded-full overflow-hidden flex bg-slate-100">
        {breakdown.map((item) => (
          <div
            key={item.nature}
            style={{ width: `${item.pct}%`, backgroundColor: NATURE_COLORS[item.nature] }}
            title={`${NATURE_LABELS[item.nature]}: ${formatNumber(item.pct, 0)}%`}
          />
        ))}
      </div>
      <ul className="space-y-1.5">
        {breakdown.map((item) => (
          <li key={item.nature} className="flex items-center justify-between gap-2 text-sm">
            <span className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: NATURE_COLORS[item.nature] }} />
              <span className="truncate text-slate-600">{NATURE_LABELS[item.nature]}</span>
            </span>
            <span className="text-right shrink-0">
              <span className="font-medium text-slate-700">{formatCurrency(item.amount)}</span>{' '}
              <span className="text-xs text-slate-400">({formatNumber(item.pct, 0)}%)</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
