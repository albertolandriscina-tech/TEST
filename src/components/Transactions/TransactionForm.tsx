import { useState } from 'react';
import type { Transaction, TransactionType } from '../../types';
import { TRANSACTION_TYPE_LABELS } from '../../types';
import { useStore } from '../../store/useStore';
import { todayISO } from '../../utils/id';
import { Modal } from '../common/Modal';
import { CategorySelect } from '../common/CategorySelect';

interface TransactionFormProps {
  initial?: Transaction;
  onClose: () => void;
}

export function TransactionForm({ initial, onClose }: TransactionFormProps) {
  const accounts = useStore((s) => s.accounts.filter((a) => !a.archived));
  const categories = useStore((s) => s.categories);
  const addTransaction = useStore((s) => s.addTransaction);
  const updateTransaction = useStore((s) => s.updateTransaction);

  const [type, setType] = useState<TransactionType>(initial?.type ?? 'expense');
  const [date, setDate] = useState(initial?.date ?? todayISO());
  const [description, setDescription] = useState(initial?.description ?? '');
  const [amount, setAmount] = useState(String(initial ? Math.abs(initial.amount) : ''));
  const [accountId, setAccountId] = useState(initial?.accountId ?? accounts[0]?.id ?? '');
  const [toAccountId, setToAccountId] = useState(initial?.toAccountId ?? '');
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? '');
  const [note, setNote] = useState(initial?.note ?? '');
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
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
    if (type !== 'transfer' && !categoryId) {
      setError('Seleziona una categoria.');
      return;
    }

    const payload = {
      date,
      description: description.trim() || (type === 'transfer' ? 'Giroconto' : 'Movimento'),
      amount: amt,
      type,
      accountId,
      categoryId: type === 'transfer' ? null : categoryId,
      toAccountId: type === 'transfer' ? toAccountId : null,
      note: note.trim() || undefined,
    };

    if (initial) {
      updateTransaction(initial.id, payload);
    } else {
      addTransaction(payload);
    }
    onClose();
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
          <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Es. Spesa supermercato" />
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
              <label className="label">Categoria</label>
              <CategorySelect categories={categories} kind={type} value={categoryId} onChange={setCategoryId} />
            </div>
          )}
        </div>

        <div>
          <label className="label">Note (opzionale)</label>
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button className="btn-secondary" onClick={onClose}>
            Annulla
          </button>
          <button className="btn-primary" onClick={submit}>
            Salva
          </button>
        </div>
      </div>
    </Modal>
  );
}
