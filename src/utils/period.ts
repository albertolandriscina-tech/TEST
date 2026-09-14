import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  endOfMonth,
  endOfQuarter,
  endOfYear,
  format,
  startOfMonth,
  startOfQuarter,
  startOfYear,
} from 'date-fns';
import { MONTH_NAMES_IT } from './format';

export type PeriodGranularity = 'month' | 'quarter' | 'semester' | 'year' | 'custom';

export interface DashboardPeriod {
  granularity: PeriodGranularity;
  start: Date;
  end: Date;
}

function startOfSemester(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() < 6 ? 0 : 6, 1);
}

function endOfSemester(d: Date): Date {
  return endOfMonth(new Date(d.getFullYear(), d.getMonth() < 6 ? 5 : 11, 1));
}

function rangeForGranularity(granularity: Exclude<PeriodGranularity, 'custom'>, anchor: Date): { start: Date; end: Date } {
  switch (granularity) {
    case 'month':
      return { start: startOfMonth(anchor), end: endOfMonth(anchor) };
    case 'quarter':
      return { start: startOfQuarter(anchor), end: endOfQuarter(anchor) };
    case 'semester':
      return { start: startOfSemester(anchor), end: endOfSemester(anchor) };
    case 'year':
      return { start: startOfYear(anchor), end: endOfYear(anchor) };
  }
}

export function defaultDashboardPeriod(): DashboardPeriod {
  return { granularity: 'month', ...rangeForGranularity('month', new Date()) };
}

/** Cambia la granularità mantenendo, per quanto possibile, il periodo corrente come riferimento. */
export function withGranularity(period: DashboardPeriod, granularity: PeriodGranularity): DashboardPeriod {
  if (granularity === 'custom') {
    return { granularity, start: period.start, end: period.end };
  }
  return { granularity, ...rangeForGranularity(granularity, period.start) };
}

export function shiftDashboardPeriod(period: DashboardPeriod, direction: 1 | -1): DashboardPeriod {
  if (period.granularity === 'custom') {
    const days = differenceInCalendarDays(period.end, period.start) + 1;
    const delta = days * direction;
    return { granularity: 'custom', start: addDays(period.start, delta), end: addDays(period.end, delta) };
  }
  const monthsToShift = { month: 1, quarter: 3, semester: 6, year: 12 }[period.granularity];
  const anchor = addMonths(period.start, monthsToShift * direction);
  return { granularity: period.granularity, ...rangeForGranularity(period.granularity, anchor) };
}

/** Il periodo immediatamente precedente, della stessa durata: usato per i confronti "vs periodo prec.". */
export function previousDashboardPeriod(period: DashboardPeriod): { start: Date; end: Date } {
  const { start, end } = shiftDashboardPeriod(period, -1);
  return { start, end };
}

export function dashboardPeriodLabel(period: DashboardPeriod): string {
  const { granularity, start, end } = period;
  switch (granularity) {
    case 'month':
      return `${MONTH_NAMES_IT[start.getMonth()]} ${start.getFullYear()}`;
    case 'quarter':
      return `${Math.floor(start.getMonth() / 3) + 1}° trimestre ${start.getFullYear()}`;
    case 'semester':
      return `${start.getMonth() < 6 ? '1°' : '2°'} semestre ${start.getFullYear()}`;
    case 'year':
      return `${start.getFullYear()}`;
    case 'custom':
      return `${format(start, 'dd/MM/yyyy')} – ${format(end, 'dd/MM/yyyy')}`;
  }
}

export function toISODate(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}
