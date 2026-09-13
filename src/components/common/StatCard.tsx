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
  accent: 'text-primary-600',
};

export function StatCard({ label, value, icon, tone = 'default', sub }: StatCardProps) {
  return (
    <div className="card flex flex-col gap-1 min-w-0">
      <div className="flex items-start justify-between gap-1 min-w-0">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-400 leading-tight">{label}</span>
        {icon && <span className="shrink-0 mt-0.5">{icon}</span>}
      </div>
      <span className={`text-lg sm:text-2xl font-semibold break-words ${toneClasses[tone]}`}>{value}</span>
      {sub && <span className="text-xs text-slate-400 truncate">{sub}</span>}
    </div>
  );
}
