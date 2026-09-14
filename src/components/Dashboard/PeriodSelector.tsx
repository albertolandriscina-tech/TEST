import { parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  dashboardPeriodLabel,
  shiftDashboardPeriod,
  toISODate,
  withGranularity,
  type DashboardPeriod,
  type PeriodGranularity,
} from '../../utils/period';

const GRANULARITIES: { value: PeriodGranularity; label: string }[] = [
  { value: 'month', label: 'Mese' },
  { value: 'quarter', label: 'Trimestre' },
  { value: 'semester', label: 'Semestre' },
  { value: 'year', label: 'Anno' },
  { value: 'custom', label: 'Personalizzato' },
];

interface PeriodSelectorProps {
  period: DashboardPeriod;
  onChange: (period: DashboardPeriod) => void;
}

export function PeriodSelector({ period, onChange }: PeriodSelectorProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex rounded-lg overflow-hidden border border-slate-200 text-xs">
        {GRANULARITIES.map((g) => (
          <button
            key={g.value}
            onClick={() => onChange(withGranularity(period, g.value))}
            className={`px-2.5 py-1.5 font-medium ${
              period.granularity === g.value ? 'bg-primary-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {g.label}
          </button>
        ))}
      </div>

      {period.granularity === 'custom' ? (
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            className="input !py-1 !px-2 !w-auto text-xs"
            value={toISODate(period.start)}
            max={toISODate(period.end)}
            onChange={(e) => e.target.value && onChange({ granularity: 'custom', start: parseISO(e.target.value), end: period.end })}
          />
          <span className="text-slate-400 text-xs">→</span>
          <input
            type="date"
            className="input !py-1 !px-2 !w-auto text-xs"
            value={toISODate(period.end)}
            min={toISODate(period.start)}
            onChange={(e) => e.target.value && onChange({ granularity: 'custom', start: period.start, end: parseISO(e.target.value) })}
          />
        </div>
      ) : (
        <div className="flex items-center gap-1">
          <button className="btn-ghost !p-1" onClick={() => onChange(shiftDashboardPeriod(period, -1))} title="Periodo precedente">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-medium text-slate-700 min-w-[8.5rem] text-center">{dashboardPeriodLabel(period)}</span>
          <button className="btn-ghost !p-1" onClick={() => onChange(shiftDashboardPeriod(period, 1))} title="Periodo successivo">
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
