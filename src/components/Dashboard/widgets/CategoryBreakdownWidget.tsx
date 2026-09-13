import { useMemo } from 'react';
import { subMonths } from 'date-fns';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { useStore } from '../../../store/useStore';
import { pctDelta } from '../../../utils/analytics';
import { formatCompactCurrency, formatCurrency } from '../../../utils/format';
import { getCategoryColor } from '../../../utils/categoryStyle';

const MAX_SLICES = 7;
const OTHER_COLOR = '#94a3b8';

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthlyExpenseByRootCategory(
  transactions: ReturnType<typeof useStore.getState>['transactions'],
  categories: ReturnType<typeof useStore.getState>['categories'],
  key: string
) {
  const roots = categories.filter((c) => c.kind === 'expense' && !c.parentId && !c.system);
  return roots
    .map((root) => {
      const value = transactions
        .filter((t) => t.type === 'expense' && !t.investmentTxId && t.date.startsWith(key))
        .filter((t) => {
          if (t.categoryId === root.id) return true;
          const cat = categories.find((c) => c.id === t.categoryId);
          return cat?.parentId === root.id;
        })
        .reduce((s, t) => s + t.amount, 0);
      return { name: root.name, value, color: getCategoryColor(root) };
    })
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);
}

function DeltaPill({ value }: { value: number | null }) {
  const neutral = value === null || Math.abs(value) < 0.5;
  const positive = value !== null && value > 0;
  const Icon = neutral ? Minus : positive ? ArrowUpRight : ArrowDownRight;
  const colorClass = neutral ? 'bg-slate-100 text-slate-500' : positive ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${colorClass}`}>
      <Icon size={12} />
      {value === null ? 'n/d' : `${formatCompactPct(value)}%`}
    </span>
  );
}

function formatCompactPct(v: number): string {
  const abs = Math.abs(v);
  return `${v < 0 ? '-' : ''}${abs.toFixed(abs < 10 ? 1 : 0)}`;
}

export function CategoryBreakdownWidget() {
  const transactions = useStore((s) => s.transactions);
  const categories = useStore((s) => s.categories);
  const now = new Date();

  const currentBreakdown = useMemo(
    () => monthlyExpenseByRootCategory(transactions, categories, monthKey(now)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [transactions, categories]
  );
  const previousTotal = useMemo(
    () => monthlyExpenseByRootCategory(transactions, categories, monthKey(subMonths(now, 1))).reduce((s, d) => s + d.value, 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [transactions, categories]
  );

  const { chartData, legendItems, total } = useMemo(() => {
    const top = currentBreakdown.slice(0, MAX_SLICES);
    const rest = currentBreakdown.slice(MAX_SLICES);
    const otherValue = rest.reduce((s, d) => s + d.value, 0);
    const items = otherValue > 0 ? [...top, { name: 'Altri', value: otherValue, color: OTHER_COLOR }] : top;
    return {
      chartData: items,
      legendItems: items,
      total: currentBreakdown.reduce((s, d) => s + d.value, 0),
    };
  }, [currentBreakdown]);

  const delta = pctDelta(total, previousTotal);

  if (currentBreakdown.length === 0) {
    return <p className="text-sm text-slate-400 text-center py-10">Nessuna spesa registrata questo mese.</p>;
  }

  return (
    <div className="h-full flex flex-col gap-2">
      <div className="flex justify-end">
        <div className="text-right">
          <div className="text-[11px] text-slate-400">VS periodo precedente</div>
          <DeltaPill value={delta} />
        </div>
      </div>

      <div className="flex-1 min-h-0 flex items-center gap-4">
        <div className="shrink-0 flex flex-col items-start gap-2">
          <div>
            <div className="text-xs text-slate-400">Tutti</div>
            <div className="text-lg font-semibold text-slate-800 whitespace-nowrap">{formatCompactCurrency(-total)}</div>
          </div>
          <div className="relative w-28 h-28 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={chartData} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="100%" paddingAngle={2} stroke="none">
                  {chartData.map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-3">
              <span className="text-[10px] text-slate-400 leading-tight text-center">Tutte le categorie</span>
            </div>
          </div>
        </div>

        <div className="flex-1 min-w-0 h-full overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
            {legendItems.map((d) => (
              <div key={d.name} className="flex items-center justify-between gap-2 min-w-0">
                <span className="flex items-center gap-1.5 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                  <span className="truncate text-slate-600">{d.name}</span>
                </span>
                <span className="text-slate-400 shrink-0">{formatCurrency(d.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
