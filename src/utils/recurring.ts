import { addDays, addMonths, addWeeks, addYears, isAfter, parseISO, format } from 'date-fns';
import type { RecurrenceFrequency, RecurringTransaction, Transaction } from '../types';
import { newId } from './id';

function nextDate(date: Date, freq: RecurrenceFrequency): Date {
  switch (freq) {
    case 'daily':
      return addDays(date, 1);
    case 'weekly':
      return addWeeks(date, 1);
    case 'monthly':
      return addMonths(date, 1);
    case 'yearly':
      return addYears(date, 1);
  }
}

/**
 * Calcola le occorrenze dovute (non ancora generate) per una regola ricorrente,
 * dalla data dell'ultima generazione (o dallo startDate) fino a oggi incluso.
 */
export function computeDueOccurrences(rule: RecurringTransaction, today: Date): string[] {
  if (!rule.active) return [];
  const start = parseISO(rule.startDate);
  const end = rule.endDate ? parseISO(rule.endDate) : null;

  let cursor = rule.lastGeneratedDate ? nextDate(parseISO(rule.lastGeneratedDate), rule.frequency) : start;

  const occurrences: string[] = [];
  let guard = 0;
  while (!isAfter(cursor, today) && guard < 2000) {
    if (end && isAfter(cursor, end)) break;
    occurrences.push(format(cursor, 'yyyy-MM-dd'));
    cursor = nextDate(cursor, rule.frequency);
    guard++;
  }
  return occurrences;
}

export function generateTransactionsForRule(
  rule: RecurringTransaction,
  dates: string[]
): Transaction[] {
  return dates.map((date) => ({
    id: newId(),
    date,
    description: rule.description,
    amount: rule.amount,
    type: rule.type,
    accountId: rule.accountId,
    categoryId: rule.categoryId ?? null,
    toAccountId: rule.toAccountId ?? null,
    note: rule.note,
    recurringId: rule.id,
    createdAt: new Date().toISOString(),
  }));
}
