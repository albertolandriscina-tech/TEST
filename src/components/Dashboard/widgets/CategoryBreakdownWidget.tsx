import { useMemo } from 'react';
import { endOfMonth, format, startOfMonth, subMonths } from 'date-fns';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { useStore } from '../../../store/useStore';
import { buildCategoryBreakdown, pctDelta } from '../../../utils/analytics';
import { formatCompactCurrency, formatCurrency, formatNumber } from '../../../utils/format';
import { CategoryIconCircle } from '../../common/CategoryBadge';

const MAX_SLICES = 6;
const OTHER_COLOR = '#94a3b8';

function monthRange(d: Date) {
  return { fromISO: format(startOfMonth(d), 'yyyy-MM-dd'), toISO: format(endOfMonth(d), 'yyyy-MM-dd') };
}

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
  const now = new Date();

  const currentBreakdown = useMemo(() => {
    const { fromISO, toISO } = monthRange(now);
    return buildCategoryBreakdown(transactions, categories, 'expense', fromISO, toISO);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, categories]);

  const previousTotal = useMemo(() => {
    const { fromISO, toISO } = monthRange(subMonths(now, 1));
    return buildCategoryBreakdown(transactions, categories, 'expense', fromISO, toISO).reduce((s, d) => s + d.amount, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, categories]);

  const { legendItems, otherValue, total } = useMemo(() => {
    const top = currentBreakdown.slice(0, MAX_SLICES);
    const rest = currentBreakdown.slice(MAX_SLICES);
    return {
      legendItems: top,
      otherValue: rest.reduce((s, d) => s + d.amount, 0),
      total: currentBreakdown.reduce((s, d) => s + d.amount, 0),
    };
  }, [currentBreakdown]);

  const chartData = useMemo(
    () => [
      ...legendItems.map((d) => ({ name: d.category.name, value: d.amount, color: d.category.color ?? OTHER_COLOR })),
      ...(otherValue > 0 ? [{ name: 'Altri', value: otherValue, color: OTHER_COLOR }] : []),
    ],
    [legendItems, otherValue]
  );

  const delta = pctDelta(total, previousTotal);

  if (currentBreakdown.length === 0) {
    return <p className="text-sm text-slate-400 text-center py-10">Nessuna spesa registrata questo mese.</p>;
  }

  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>
          Tutte le categorie · <span className="font-medium text-slate-700">{formatCompactCurrency(-total)}</span>
        </span>
        <span className="flex items-center gap-1 text-slate-400">
          vs mese prec. <MiniDelta value={delta} />
        </span>
      </div>

      <div className="flex justify-center shrink-0">
        <div className="relative w-40 h-40">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={chartData} dataKey="value" nameKey="name" innerRadius="60%" outerRadius="100%" paddingAngle={2} stroke="none">
                {chartData.map((d, i) => (
                  <Cell key={i} fill={d.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-4">
            <span className="text-xs text-slate-400 leading-tight text-center">Tutte le categorie</span>
          </div>
        </div>
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
