import type { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: string;
  icon?: ReactNode;
  tone?: 'default' | 'positive' | 'negative' | 'accent';
  sub?: string;
}

const toneClasses: Record<string, string> = {
  default: 'text-slate-800',
  positive: 'text-emerald-600',
  negative: 'text-red-600',
  accent: 'text-indigo-600',
};

export function StatCard({ label, value, icon, tone = 'default', sub }: StatCardProps) {
  return (
    <div className="card flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</span>
        {icon}
      </div>
      <span className={`text-2xl font-semibold ${toneClasses[tone]}`}>{value}</span>
      {sub && <span className="text-xs text-slate-400">{sub}</span>}
    </div>
  );
}
