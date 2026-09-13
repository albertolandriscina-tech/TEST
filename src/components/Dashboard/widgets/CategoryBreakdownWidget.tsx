import { useMemo } from 'react';
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { useStore } from '../../../store/useStore';
import { formatCurrency } from '../../../utils/format';

const PALETTE = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6', '#14b8a6'];

export function CategoryBreakdownWidget() {
  const transactions = useStore((s) => s.transactions);
  const categories = useStore((s) => s.categories);

  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const categoryBreakdown = useMemo(() => {
    const roots = categories.filter((c) => c.kind === 'expense' && !c.parentId);
    return roots
      .map((root) => {
        const value = transactions
          .filter((t) => t.type === 'expense' && t.date.startsWith(currentMonthKey))
          .filter((t) => {
            if (t.categoryId === root.id) return true;
            const cat = categories.find((c) => c.id === t.categoryId);
            return cat?.parentId === root.id;
          })
          .reduce((s, t) => s + t.amount, 0);
        return { name: root.name, value };
      })
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [transactions, categories, currentMonthKey]);

  if (categoryBreakdown.length === 0) {
    return <p className="text-sm text-slate-400 text-center py-10">Nessuna spesa registrata questo mese.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={categoryBreakdown} dataKey="value" nameKey="name" innerRadius="45%" outerRadius="75%" paddingAngle={2}>
          {categoryBreakdown.map((_, i) => (
            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(v: number) => formatCurrency(v)} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
