import { useEffect, useState } from 'react';
import { shallow } from 'zustand/shallow';
import { Plus, Trash2 } from 'lucide-react';
import type { Transaction, TransactionType } from '../../types';
import { TRANSACTION_TYPE_LABELS } from '../../types';
import { useStore } from '../../store/useStore';
import { todayISO } from '../../utils/id';
import { round2 } from '../../utils/ledger';
import { findMatchingRule } from '../../utils/rules';
import { formatCurrency } from '../../utils/format';
import { Modal } from '../common/Modal';
import { CategorySelect } from '../common/CategorySelect';

interface TransactionFormProps {
  initial?: Transaction;
  onClose: () => void;
}

interface SplitRow {
  categoryId: string;
  amount: string;
}

export function TransactionForm({ initial, onClose }: TransactionFormProps) {
  const accounts = useStore((s) => s.accounts.filter((a) => !a.archived), shallow);
  const categories = useStore((s) => s.categories);
  const categorizationRules = useStore((s) => s.categorizationRules);
  const addTransaction = useStore((s) => s.addTransaction);
  const updateTransaction = useStore((s) => s.updateTransaction);

  const [type, setType] = useState<TransactionType>(initial?.type ?? 'expense');
  const [date, setDate] = useState(initial?.date ?? todayISO());
  const [description, setDescription] = useState(initial?.description ?? '');
  const [amount, setAmount] = useState(String(initial ? Math.abs(initial.amount) : ''));
  const [accountId, setAccountId] = useState(initial?.accountId ?? accounts[0]?.id ?? '');
  const [toAccountId, setToAccountId] = useState(initial?.toAccountId ?? '');
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? '');
  const [isSplit, setIsSplit] = useState(!!initial?.splits && initial.splits.length > 0);
  const [splits, setSplits] = useState<SplitRow[]>(
    initial?.splits?.map((s) => ({ categoryId: s.categoryId ?? '', amount: String(s.amount) })) ?? []
  );
  const [note, setNote] = useState(initial?.note ?? '');
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [autoRuleName, setAutoRuleName] = useState<string | null>(null);

  const suggestCategoryFromDescription = () => {
    if (isSplit || type === 'transfer' || categoryId || !accountId || !description.trim()) return;
    const rule = findMatchingRule(categorizationRules, { description, type, accountId });
    if (rule) {
      setCategoryId(rule.categoryId);
      setAutoRuleName(rule.name);
    }
  };

  useEffect(() => {
    if (!savedMessage) return;
    const t = setTimeout(() => setSavedMessage(null), 2500);
    return () => clearTimeout(t);
  }, [savedMessage]);

  const splitTotal = round2(splits.reduce((s, row) => s + (Number(row.amount) || 0), 0));

  const toggleSplit = () => {
    if (isSplit) {
      // Torna a categoria singola: riprende la prima categoria frazionata, se impostata.
      setCategoryId(splits[0]?.categoryId || categoryId);
      setIsSplit(false);
      return;
    }
    setIsSplit(true);
    setSplits([
      { categoryId: categoryId, amount: amount || '' },
      { categoryId: '', amount: '' },
    ]);
  };

  const addSplitRow = () => {
    const remaining = round2(Math.max(0, (Number(amount) || 0) - splitTotal));
    setSplits((rows) => [...rows, { categoryId: '', amount: remaining > 0 ? String(remaining) : '' }]);
  };

  const updateSplitRow = (index: number, patch: Partial<SplitRow>) => {
    setSplits((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const removeSplitRow = (index: number) => {
    setSplits((rows) => rows.filter((_, i) => i !== index));
  };

  const submit = (andNew: boolean) => {
    const amt = Math.abs(Number(amount));
    if (!amt || amt <= 0) {
      setError('Inserisci un importo positivo (il segno viene gestito automaticamente).');
      return;
    }
    if (!accountId) {
      setError('Seleziona un conto.');
      return;
    }
    if (type === 'transfer' && (!toAccountId || toAccountId === accountId)) {
      setError('Seleziona un conto di destinazione diverso da quello di origine.');
      return;
    }
    if (type !== 'transfer' && !isSplit && !categoryId) {
      setError('Seleziona una categoria.');
      return;
    }
    if (type !== 'transfer' && isSplit) {
      if (splits.length < 2 || splits.some((row) => !row.categoryId)) {
        setError('Seleziona una categoria per ogni riga del frazionamento (almeno due).');
        return;
      }
      if (splits.some((row) => !(Number(row.amount) > 0))) {
        setError('Inserisci un importo positivo per ogni categoria.');
        return;
      }
      if (Math.abs(splitTotal - amt) > 0.005) {
        setError(`La somma delle categorie (${formatCurrency(splitTotal)}) non corrisponde all'importo totale (${formatCurrency(amt)}).`);
        return;
      }
    }

    const payload = {
      date,
      description: description.trim() || (type === 'transfer' ? 'Giroconto' : 'Movimento'),
      amount: amt,
      type,
      accountId,
      categoryId: type === 'transfer' || isSplit ? null : categoryId,
      splits: type !== 'transfer' && isSplit ? splits.map((row) => ({ categoryId: row.categoryId, amount: round2(Number(row.amount)) })) : undefined,
      toAccountId: type === 'transfer' ? toAccountId : null,
      note: note.trim() || undefined,
    };

    if (initial) {
      updateTransaction(initial.id, payload);
      onClose();
      return;
    }

    addTransaction(payload);
    if (!andNew) {
      onClose();
      return;
    }

    // "Salva e nuovo": mantiene data, tipo e conto (comodo per inserire più movimenti
    // simili di fila) e azzera solo i campi specifici del singolo movimento.
    setDescription('');
    setAmount('');
    setIsSplit(false);
    setSplits([]);
    setNote('');
    setError(null);
    setSavedMessage('Movimento salvato.');
  };

  return (
    <Modal title={initial ? 'Modifica movimento' : 'Nuovo movimento'} onClose={onClose}>
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          {(['expense', 'income', 'transfer'] as TransactionType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setType(t);
                setCategoryId('');
                setIsSplit(false);
                setSplits([]);
                setAutoRuleName(null);
              }}
              className={`btn justify-center ${
                type === t
                  ? t === 'income'
                    ? 'bg-emerald-600 text-white'
                    : t === 'expense'
                    ? 'bg-red-600 text-white'
                    : 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {TRANSACTION_TYPE_LABELS[t]}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Data</label>
            <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label className="label">Importo (sempre positivo)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="input"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>
        </div>

        <div>
          <label className="label">Descrizione</label>
          <input
            className="input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={suggestCategoryFromDescription}
            placeholder="Es. Spesa supermercato"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label">{type === 'transfer' ? 'Conto di origine' : 'Conto'}</label>
            <select className="input" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              <option value="" disabled>
                Seleziona conto...
              </option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          {type === 'transfer' ? (
            <div>
              <label className="label">Conto di destinazione</label>
              <select className="input" value={toAccountId} onChange={(e) => setToAccountId(e.target.value)}>
                <option value="" disabled>
                  Seleziona conto...
                </option>
                {accounts
                  .filter((a) => a.id !== accountId)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
              </select>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between">
                <label className="label !mb-0">Categoria</label>
                <button type="button" className="text-xs font-medium text-primary-600 hover:underline" onClick={toggleSplit}>
                  {isSplit ? 'Categoria singola' : 'Dividi in più categorie'}
                </button>
              </div>
              {isSplit ? (
                <p className="input flex items-center text-slate-400 !cursor-default">Frazionato su {splits.length} categorie</p>
              ) : (
                <>
                  <CategorySelect
                    categories={categories}
                    kind={type}
                    value={categoryId}
                    onChange={(id) => {
                      setCategoryId(id);
                      setAutoRuleName(null);
                    }}
                  />
                  {autoRuleName && (
                    <p className="text-xs text-primary-600 mt-1">Categoria assegnata dalla regola "{autoRuleName}".</p>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {type !== 'transfer' && isSplit && (
          <div className="space-y-2 border border-slate-200 rounded-lg p-3">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Frazionamento per categoria</span>
              <span className={Math.abs(splitTotal - (Number(amount) || 0)) > 0.005 ? 'text-red-600 font-medium' : 'text-emerald-600 font-medium'}>
                {formatCurrency(splitTotal)} / {formatCurrency(Number(amount) || 0)}
              </span>
            </div>
            {splits.map((row, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <CategorySelect
                    categories={categories}
                    kind={type}
                    value={row.categoryId}
                    onChange={(id) => updateSplitRow(i, { categoryId: id })}
                  />
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="input !w-24 shrink-0"
                  value={row.amount}
                  onChange={(e) => updateSplitRow(i, { amount: e.target.value })}
                  placeholder="0.00"
                />
                <button
                  type="button"
                  className="btn-ghost !p-1.5 text-red-500 shrink-0 disabled:opacity-30 disabled:pointer-events-none"
                  onClick={() => removeSplitRow(i)}
                  disabled={splits.length <= 2}
                  title="Rimuovi categoria"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <button type="button" className="btn-secondary !py-1 text-xs" onClick={addSplitRow}>
              <Plus size={13} /> Aggiungi categoria
            </button>
          </div>
        )}

        <div>
          <label className="label">Note (opzionale)</label>
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {savedMessage && <p className="text-sm text-emerald-600">{savedMessage}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button className="btn-secondary" onClick={onClose}>
            Annulla
          </button>
          {!initial && (
            <button className="btn-secondary" onClick={() => submit(true)}>
              Salva e nuovo
            </button>
          )}
          <button className="btn-primary" onClick={() => submit(false)}>
            Salva
          </button>
        </div>
      </div>
    </Modal>
  );
}
