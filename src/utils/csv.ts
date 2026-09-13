import Papa from 'papaparse';
import { parse as parseDateFns, isValid, format } from 'date-fns';
import type { Account, Category, CategoryKind, Transaction, TransactionType } from '../types';
import { getCategoryPath } from './ledger';

export interface CategoryPath {
  root: string;
  child?: string;
}

/** Interpreta un nome categoria esportato come "Genitore > Figlia" (o solo "Categoria"). */
export function parseCategoryPath(raw: string): CategoryPath {
  const parts = raw
    .split(/[>›]/)
    .map((s) => s.trim())
    .filter(Boolean);
  return { root: parts[0] ?? raw.trim(), child: parts[1] };
}

const norm = (s: string) => s.trim().toLowerCase();

/** Cerca una categoria esistente (anche sottocategoria) a partire dal path "Genitore > Figlia". */
export function findCategoryByPath(categories: Category[], kind: CategoryKind, path: CategoryPath): Category | undefined {
  if (path.child) {
    const parent = categories.find((c) => c.kind === kind && !c.parentId && norm(c.name) === norm(path.root));
    if (!parent) return undefined;
    return categories.find((c) => c.parentId === parent.id && norm(c.name) === norm(path.child!));
  }
  return categories.find((c) => c.kind === kind && !c.parentId && norm(c.name) === norm(path.root));
}

// ---------- Esportazione ----------

export interface ExportRow {
  Data: string;
  Tipo: string;
  Descrizione: string;
  Conto: string;
  ContoDestinazione: string;
  Categoria: string;
  Importo: string;
  Note: string;
}

const TYPE_LABEL_EXPORT: Record<TransactionType, string> = {
  income: 'Entrata',
  expense: 'Uscita',
  transfer: 'Giroconto',
};

export function transactionsToCSV(transactions: Transaction[], accounts: Account[], categories: Category[]): string {
  const accountName = (id: string) => accounts.find((a) => a.id === id)?.name ?? '';
  const rows: ExportRow[] = transactions.map((t) => ({
    Data: t.date,
    Tipo: TYPE_LABEL_EXPORT[t.type],
    Descrizione: t.description,
    Conto: accountName(t.accountId),
    ContoDestinazione: t.toAccountId ? accountName(t.toAccountId) : '',
    Categoria: t.type === 'transfer' ? '' : getCategoryPath(t.categoryId, categories).replace(' › ', ' > '),
    Importo: t.amount.toFixed(2),
    Note: t.note ?? '',
  }));
  return Papa.unparse(rows, { columns: ['Data', 'Tipo', 'Descrizione', 'Conto', 'ContoDestinazione', 'Categoria', 'Importo', 'Note'] });
}

export function downloadTextFile(filename: string, content: string, mimeType = 'text/csv;charset=utf-8;'): void {
  const blob = new Blob(['﻿' + content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ---------- Importazione ----------

export interface ParsedCSV {
  headers: string[];
  rows: Record<string, string>[];
}

export function parseCSVFile(text: string): ParsedCSV {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });
  const headers = result.meta.fields ?? [];
  return { headers, rows: result.data };
}

const COLUMN_ALIASES: Record<string, string[]> = {
  date: ['data', 'date', 'data operazione', 'data valuta'],
  amount: ['importo', 'amount', 'valore', 'importo eur'],
  description: ['descrizione', 'description', 'causale', 'memo', 'note operazione'],
  type: ['tipo', 'type'],
  account: ['conto', 'account'],
  toAccount: ['contodestinazione', 'conto destinazione', 'to account', 'destinazione'],
  category: ['categoria', 'category'],
  note: ['note', 'notes', 'commento'],
};

export type ImportField = keyof typeof COLUMN_ALIASES;

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase();
}

export function autoDetectMapping(headers: string[]): Record<ImportField, string | null> {
  const normalized = headers.map((h) => ({ original: h, norm: normalizeHeader(h) }));
  const mapping = {} as Record<ImportField, string | null>;
  (Object.keys(COLUMN_ALIASES) as ImportField[]).forEach((field) => {
    const aliases = COLUMN_ALIASES[field];
    const match = normalized.find((h) => aliases.includes(h.norm));
    mapping[field] = match?.original ?? null;
  });
  return mapping;
}

const TYPE_ALIASES: Record<string, TransactionType> = {
  entrata: 'income',
  entrate: 'income',
  income: 'income',
  i: 'income',
  uscita: 'expense',
  uscite: 'expense',
  expense: 'expense',
  spesa: 'expense',
  e: 'expense',
  giroconto: 'transfer',
  transfer: 'transfer',
  bonifico: 'transfer',
};

export function parseAmount(raw: string): number | null {
  if (!raw) return null;
  let s = raw.trim().replace(/[€\s]/g, '');
  if (!s) return null;
  const hasComma = s.includes(',');
  const hasDot = s.includes('.');
  if (hasComma && hasDot) {
    // formato europeo "1.234,56": il punto è separatore delle migliaia
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      s = s.replace(/,/g, '');
    }
  } else if (hasComma) {
    s = s.replace(',', '.');
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

const DATE_FORMATS = ['yyyy-MM-dd', 'dd/MM/yyyy', 'dd-MM-yyyy', 'MM/dd/yyyy', 'dd.MM.yyyy'];

export function parseFlexibleDate(raw: string): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  for (const fmt of DATE_FORMATS) {
    const d = parseDateFns(trimmed, fmt, new Date());
    if (isValid(d)) return format(d, 'yyyy-MM-dd');
  }
  const native = new Date(trimmed);
  if (isValid(native) && !Number.isNaN(native.getTime())) return format(native, 'yyyy-MM-dd');
  return null;
}

export function parseTransactionType(raw: string | undefined): TransactionType | null {
  if (!raw) return null;
  return TYPE_ALIASES[raw.trim().toLowerCase()] ?? null;
}

export interface ImportedRow {
  rowIndex: number;
  date: string | null;
  description: string;
  amount: number | null;
  type: TransactionType;
  accountName: string | null;
  toAccountName: string | null;
  categoryName: string | null;
  note?: string;
  error: string | null;
}

export function interpretRow(
  raw: Record<string, string>,
  mapping: Record<ImportField, string | null>,
  rowIndex: number
): ImportedRow {
  const get = (field: ImportField) => (mapping[field] ? raw[mapping[field]!]?.trim() ?? '' : '');

  const date = parseFlexibleDate(get('date'));
  const description = get('description') || 'Movimento importato';
  const amountRaw = get('amount');
  const parsedAmount = parseAmount(amountRaw);
  const toAccountName = get('toAccount') || null;
  const accountName = get('account') || null;
  const categoryName = get('category') || null;
  const note = get('note') || undefined;

  let type = parseTransactionType(get('type'));
  if (!type) {
    if (toAccountName) type = 'transfer';
    else if (parsedAmount !== null) type = parsedAmount < 0 ? 'expense' : 'income';
    else type = 'expense';
  }

  let error: string | null = null;
  if (!date) error = 'Data non riconosciuta';
  else if (parsedAmount === null) error = 'Importo non valido';
  else if (parsedAmount === 0) error = 'Importo pari a zero';

  return {
    rowIndex,
    date,
    description,
    amount: parsedAmount !== null ? Math.abs(parsedAmount) : null,
    type,
    accountName,
    toAccountName,
    categoryName,
    note,
    error,
  };
}
