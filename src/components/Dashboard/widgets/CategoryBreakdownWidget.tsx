import { useMemo } from 'react';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { useStore } from '../../../store/useStore';
import { buildCategoryBreakdown, pctDelta } from '../../../utils/analytics';
import { formatCurrency, formatNumber } from '../../../utils/format';
import { dashboardPeriodLabel, previousDashboardPeriod, toISODate } from '../../../utils/period';
import { useDashboardPeriod } from '../DashboardPeriodContext';
import { CategoryIconCircle } from '../../common/CategoryBadge';

const MAX_SLICES = 6;

function MiniDelta({ value }: { value: number | null }) {
  const neutral = value === null || Math.abs(value) < 0.5;
  const positive = value !== null && value > 0;
  const Icon = neutral ? Minus : positive ? ArrowUpRight : ArrowDownRight;
  const colorClass = neutral ? 'text-slate-400' : positive ? 'text-red-600' : 'text-emerald-600';
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${colorClass}`}>
      <Icon size={12} />
      {value === null ? 'n/d' : `${formatNumber(Math.abs(value), value >= 10 || value <= -10 ? 0 : 1)}%`}
    </span>
  );
}

export function CategoryBreakdownWidget() {
  const transactions = useStore((s) => s.transactions);
  const categories = useStore((s) => s.categories);
  const period = useDashboardPeriod();

  const currentBreakdown = useMemo(
    () => buildCategoryBreakdown(transactions, categories, 'expense', toISODate(period.start), toISODate(period.end)),
    [transactions, categories, period]
  );

  const previousTotal = useMemo(() => {
    const prev = previousDashboardPeriod(period);
    return buildCategoryBreakdown(transactions, categories, 'expense', toISODate(prev.start), toISODate(prev.end)).reduce(
      (s, d) => s + d.amount,
      0
    );
  }, [transactions, categories, period]);

  const { legendItems, otherValue, total } = useMemo(() => {
    const top = currentBreakdown.slice(0, MAX_SLICES);
    const rest = currentBreakdown.slice(MAX_SLICES);
    return {
      legendItems: top,
      otherValue: rest.reduce((s, d) => s + d.amount, 0),
      total: currentBreakdown.reduce((s, d) => s + d.amount, 0),
    };
  }, [currentBreakdown]);

  const delta = pctDelta(total, previousTotal);

  if (currentBreakdown.length === 0) {
    return <p className="text-sm text-slate-400 text-center py-10">Nessuna spesa registrata nel periodo.</p>;
  }

  return (
    <div className="flex flex-col h-full gap-3">
      <p className="text-xs text-slate-400">{dashboardPeriodLabel(period)}</p>
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>
          Tutte le categorie · <span className="font-medium text-slate-700">{formatCurrency(-total)}</span>
        </span>
        <span className="flex items-center gap-1 text-slate-400">
          vs periodo prec. <MiniDelta value={delta} />
        </span>
      </div>

      <ul className="flex-1 overflow-auto space-y-2 min-h-0">
        {legendItems.map(({ category, amount }) => (
          <li key={category.id} className="flex items-center justify-between gap-2 text-xs">
            <span className="flex items-center gap-1.5 min-w-0 text-slate-600 truncate">
              <CategoryIconCircle category={category} />
              <span className="truncate">{category.name}</span>
            </span>
            <span className="text-slate-500 shrink-0 whitespace-nowrap">{formatCurrency(amount)}</span>
          </li>
        ))}
        {otherValue > 0 && (
          <li className="flex items-center justify-between gap-2 text-xs">
            <span className="flex items-center gap-1.5 min-w-0 text-slate-600 truncate">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-slate-400 shrink-0 text-[10px]">
                ⋯
              </span>
              <span className="truncate">Altri</span>
            </span>
            <span className="text-slate-500 shrink-0 whitespace-nowrap">{formatCurrency(otherValue)}</span>
          </li>
        )}
      </ul>
    </div>
  );
}
