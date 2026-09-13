import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Upload } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Modal } from '../common/Modal';
import {
  autoDetectMapping,
  findCategoryByPath,
  interpretRow,
  parseCategoryPath,
  parseCSVFile,
  type CategoryPath,
  type ImportedRow,
  type ImportField,
  type ParsedCSV,
} from '../../utils/csv';
import { formatCurrency, formatDate } from '../../utils/format';
import type { Transaction } from '../../types';

interface Props {
  onClose: () => void;
}

const FIELD_LABELS: Record<ImportField, string> = {
  date: 'Data',
  amount: 'Importo',
  description: 'Descrizione',
  type: 'Tipo (entrata/uscita/giroconto)',
  account: 'Conto',
  toAccount: 'Conto destinazione (giroconti)',
  category: 'Categoria',
  note: 'Note',
};

const REQUIRED_FIELDS: ImportField[] = ['date', 'amount'];

type Step = 'upload' | 'mapping' | 'preview';

export function ImportTransactionsModal({ onClose }: Props) {
  const accounts = useStore((s) => s.accounts.filter((a) => !a.archived));
  const categories = useStore((s) => s.categories);
  const addAccount = useStore((s) => s.addAccount);
  const addCategory = useStore((s) => s.addCategory);
  const addTransactions = useStore((s) => s.addTransactions);

  const [step, setStep] = useState<Step>('upload');
  const [fileName, setFileName] = useState('');
  const [parsed, setParsed] = useState<ParsedCSV | null>(null);
  const [mapping, setMapping] = useState<Record<ImportField, string | null>>({} as Record<ImportField, string | null>);
  const [defaultAccountId, setDefaultAccountId] = useState(accounts[0]?.id ?? '');
  const [createMissingAccounts, setCreateMissingAccounts] = useState(true);
  const [createMissingCategories, setCreateMissingCategories] = useState(true);
  const [fileError, setFileError] = useState<string | null>(null);
  const [imported, setImported] = useState<number | null>(null);

  const handleFile = async (file: File) => {
    setFileError(null);
    setFileName(file.name);
    const text = await file.text();
    const result = parseCSVFile(text);
    if (result.headers.length === 0 || result.rows.length === 0) {
      setFileError('Il file non contiene righe valide o non è un CSV con intestazione.');
      return;
    }
    setParsed(result);
    setMapping(autoDetectMapping(result.headers));
    setStep('mapping');
  };

  const missingRequired = REQUIRED_FIELDS.filter((f) => !mapping[f]);

  const interpretedRows: ImportedRow[] = useMemo(() => {
    if (!parsed) return [];
    return parsed.rows.map((raw, i) => interpretRow(raw, mapping, i));
  }, [parsed, mapping]);

  const plan = useMemo(() => {
    const accountsToCreate = new Set<string>();
    // chiave `${kind}|${root}|${child ?? ''}` -> path, per deduplicare le categorie mancanti
    const categoriesToCreate = new Map<string, { kind: 'income' | 'expense'; path: CategoryPath }>();
    const findAccount = (name: string | null) =>
      name ? accounts.find((a) => a.name.trim().toLowerCase() === name.trim().toLowerCase()) : undefined;

    const resolved = interpretedRows.map((row) => {
      if (row.error) return { row, ok: false as const };

      let accountId = defaultAccountId;
      if (row.accountName) {
        const found = findAccount(row.accountName);
        if (found) accountId = found.id;
        else if (createMissingAccounts) accountsToCreate.add(row.accountName);
        else accountId = defaultAccountId;
      }

      let toAccountId: string | undefined;
      if (row.type === 'transfer') {
        if (row.toAccountName) {
          const found = findAccount(row.toAccountName);
          if (found) toAccountId = found.id;
          else if (createMissingAccounts) accountsToCreate.add(row.toAccountName);
        }
        if (!toAccountId && !(row.toAccountName && createMissingAccounts)) {
          return { row: { ...row, error: 'Conto destinazione del giroconto mancante o non riconosciuto' }, ok: false as const };
        }
      }

      let categoryId: string | null = null;
      if (row.type !== 'transfer' && row.categoryName) {
        const kind = row.type;
        const path = parseCategoryPath(row.categoryName);
        const found = findCategoryByPath(categories, kind, path);
        if (found) categoryId = found.id;
        else if (createMissingCategories) {
          categoriesToCreate.set(`${kind}|${path.root.toLowerCase()}|${(path.child ?? '').toLowerCase()}`, { kind, path });
        }
      }

      return { row, ok: true as const, accountId, toAccountId, categoryId };
    });

    return {
      resolved,
      accountsToCreate: Array.from(accountsToCreate),
      categoriesToCreate: Array.from(categoriesToCreate.values()),
    };
  }, [interpretedRows, accounts, categories, defaultAccountId, createMissingAccounts, createMissingCategories]);

  const validCount = plan.resolved.filter((r) => r.ok).length;
  const errorCount = plan.resolved.length - validCount;

  const confirmImport = () => {
    const accountIdByName = new Map<string, string>();
    for (const name of plan.accountsToCreate) {
      const id = addAccount({ name, type: 'bank', initialBalance: 0, currency: 'EUR' });
      accountIdByName.set(name.toLowerCase(), id);
    }

    // Crea prima le categorie principali mancanti, poi le sottocategorie (che potrebbero
    // dipendere da un genitore appena creato in questo stesso import).
    const rootIdByKey = new Map<string, string>(); // `${kind}|${root}` -> id
    for (const c of categories) {
      if (!c.archived && !c.parentId) rootIdByKey.set(`${c.kind}|${c.name.trim().toLowerCase()}`, c.id);
    }
    const toCreate = plan.categoriesToCreate;
    for (const { kind, path } of toCreate) {
      const rootKey = `${kind}|${path.root.toLowerCase()}`;
      if (!path.child && !rootIdByKey.has(rootKey)) {
        rootIdByKey.set(rootKey, addCategory({ name: path.root, kind, parentId: null }));
      }
    }
    const childIdByKey = new Map<string, string>(); // `${kind}|${root}|${child}` -> id
    for (const { kind, path } of toCreate) {
      if (!path.child) continue;
      const rootKey = `${kind}|${path.root.toLowerCase()}`;
      let parentId = rootIdByKey.get(rootKey);
      if (!parentId) {
        parentId = addCategory({ name: path.root, kind, parentId: null });
        rootIdByKey.set(rootKey, parentId);
      }
      const childKey = `${rootKey}|${path.child.toLowerCase()}`;
      if (!childIdByKey.has(childKey)) {
        childIdByKey.set(childKey, addCategory({ name: path.child, kind, parentId }));
      }
    }

    const resolveAccount = (id: string | undefined, name: string | null): string | undefined => {
      if (id) return id;
      if (name) return accountIdByName.get(name.toLowerCase());
      return undefined;
    };

    const resolveCategory = (categoryId: string | null, categoryName: string | null, kind: 'income' | 'expense'): string | null => {
      if (categoryId) return categoryId;
      if (!categoryName) return null;
      const path = parseCategoryPath(categoryName);
      const rootKey = `${kind}|${path.root.toLowerCase()}`;
      if (path.child) return childIdByKey.get(`${rootKey}|${path.child.toLowerCase()}`) ?? null;
      return rootIdByKey.get(rootKey) ?? null;
    };

    const payload: Omit<Transaction, 'id' | 'createdAt'>[] = [];
    for (const item of plan.resolved) {
      if (!item.ok) continue;
      const { row, accountId, toAccountId, categoryId } = item;
      const finalAccountId = resolveAccount(accountId, row.accountName) ?? defaultAccountId;
      const finalToAccountId = row.type === 'transfer' ? resolveAccount(toAccountId, row.toAccountName) : undefined;
      const finalCategoryId = row.type === 'transfer' ? null : resolveCategory(categoryId, row.categoryName, row.type);

      if (row.type === 'transfer' && !finalToAccountId) continue;

      payload.push({
        date: row.date!,
        description: row.description,
        amount: row.amount!,
        type: row.type,
        accountId: finalAccountId,
        categoryId: finalCategoryId,
        toAccountId: row.type === 'transfer' ? finalToAccountId ?? null : null,
        note: row.note,
      });
    }

    addTransactions(payload);
    setImported(payload.length);
  };

  return (
    <Modal title="Importa movimenti da CSV" onClose={onClose} width="max-w-3xl">
      {step === 'upload' && (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Importa un file CSV esportato da questa app o da un altro programma (es. estratto conto bancario). Le colonne
            verranno riconosciute automaticamente e potrai correggerle nel passaggio successivo.
          </p>
          <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-300 rounded-xl py-10 cursor-pointer hover:border-primary-400 hover:bg-primary-50/40 transition-colors">
            <Upload size={28} className="text-slate-400" />
            <span className="text-sm text-slate-500">Clicca per selezionare un file .csv</span>
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </label>
          {fileError && <p className="text-sm text-red-600">{fileError}</p>}
        </div>
      )}

      {step === 'mapping' && parsed && (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            File <strong>{fileName}</strong> — {parsed.rows.length} righe rilevate. Associa le colonne del file ai campi
            dell'app.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(Object.keys(FIELD_LABELS) as ImportField[]).map((field) => (
              <div key={field}>
                <label className="label">
                  {FIELD_LABELS[field]}
                  {REQUIRED_FIELDS.includes(field) && <span className="text-red-500"> *</span>}
                </label>
                <select
                  className="input"
                  value={mapping[field] ?? ''}
                  onChange={(e) => setMapping((m) => ({ ...m, [field]: e.target.value || null }))}
                >
                  <option value="">— Nessuna —</option>
                  {parsed.headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
            <div>
              <label className="label">Conto predefinito (se non indicato o non trovato nel file)</label>
              <select className="input" value={defaultAccountId} onChange={(e) => setDefaultAccountId(e.target.value)}>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col justify-end gap-1.5 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={createMissingAccounts} onChange={(e) => setCreateMissingAccounts(e.target.checked)} />
                Crea automaticamente i conti mancanti
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={createMissingCategories} onChange={(e) => setCreateMissingCategories(e.target.checked)} />
                Crea automaticamente le categorie mancanti
              </label>
            </div>
          </div>

          {missingRequired.length > 0 && (
            <p className="text-sm text-red-600">
              Campi obbligatori non associati: {missingRequired.map((f) => FIELD_LABELS[f]).join(', ')}.
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button className="btn-secondary" onClick={() => setStep('upload')}>
              Indietro
            </button>
            <button className="btn-primary" disabled={missingRequired.length > 0} onClick={() => setStep('preview')}>
              Avanti: anteprima
            </button>
          </div>
        </div>
      )}

      {step === 'preview' && (
        <div className="space-y-4">
          {imported !== null ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <CheckCircle2 size={40} className="text-emerald-500" />
              <p className="text-slate-700 font-medium">Importati {imported} movimenti.</p>
              <button className="btn-primary" onClick={onClose}>
                Chiudi
              </button>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-3 text-sm">
                <span className="badge bg-emerald-50 text-emerald-700">{validCount} righe valide</span>
                {errorCount > 0 && <span className="badge bg-red-50 text-red-600">{errorCount} righe con errori (verranno ignorate)</span>}
                {plan.accountsToCreate.length > 0 && (
                  <span className="badge bg-primary-50 text-primary-600">
                    {plan.accountsToCreate.length} nuovi conti: {plan.accountsToCreate.join(', ')}
                  </span>
                )}
                {plan.categoriesToCreate.length > 0 && (
                  <span className="badge bg-primary-50 text-primary-600">
                    {plan.categoriesToCreate.length} nuove categorie:{' '}
                    {plan.categoriesToCreate.map((c) => (c.path.child ? `${c.path.root} > ${c.path.child}` : c.path.root)).join(', ')}
                  </span>
                )}
              </div>

              <div className="max-h-80 overflow-auto border border-slate-200 rounded-lg">
                <table className="table-base">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Tipo</th>
                      <th>Descrizione</th>
                      <th className="text-right">Importo</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {plan.resolved.slice(0, 50).map(({ row, ok }) => (
                      <tr key={row.rowIndex} className={!ok ? 'bg-red-50' : ''}>
                        <td>{row.date ? formatDate(row.date) : '—'}</td>
                        <td>{row.type}</td>
                        <td className="truncate max-w-[200px]">{row.description}</td>
                        <td className="text-right">{row.amount !== null ? formatCurrency(row.amount) : '—'}</td>
                        <td>
                          {!ok && (
                            <span className="flex items-center gap-1 text-xs text-red-600">
                              <AlertTriangle size={12} /> {row.error}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {plan.resolved.length > 50 && (
                  <p className="text-xs text-slate-400 text-center py-2">… e altre {plan.resolved.length - 50} righe.</p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button className="btn-secondary" onClick={() => setStep('mapping')}>
                  Indietro
                </button>
                <button className="btn-primary" disabled={validCount === 0} onClick={confirmImport}>
                  Importa {validCount} movimenti
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </Modal>
  );
}
