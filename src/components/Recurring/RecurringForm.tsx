import { useState } from 'react';
import type { RecurrenceFrequency, RecurringTransaction, TransactionType } from '../../types';
import { RECURRENCE_LABELS, TRANSACTION_TYPE_LABELS } from '../../types';
import { useStore } from '../../store/useStore';
import { todayISO } from '../../utils/id';
import { Modal } from '../common/Modal';
import { CategorySelect } from '../common/CategorySelect';

interface Props {
  initial?: RecurringTransaction;
  onClose: () => void;
}

export function RecurringForm({ initial, onClose }: Props) {
  const accounts = useStore((s) => s.accounts.filter((a) => !a.archived));
  const categories = useStore((s) => s.categories);
  const addRecurring = useStore((s) => s.addRecurring);
  const updateRecurring = useStore((s) => s.updateRecurring);

  const [description, setDescription] = useState(initial?.description ?? '');
  const [type, setType] = useState<TransactionType>(initial?.type ?? 'expense');
  const [amount, setAmount] = useState(String(initial?.amount ?? ''));
  const [accountId, setAccountId] = useState(initial?.accountId ?? accounts[0]?.id ?? '');
  const [toAccountId, setToAccountId] = useState(initial?.toAccountId ?? '');
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? '');
  const [frequency, setFrequency] = useState<RecurrenceFrequency>(initial?.frequency ?? 'monthly');
  const [startDate, setStartDate] = useState(initial?.startDate ?? todayISO());
  const [endDate, setEndDate] = useState(initial?.endDate ?? '');
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const amt = Math.abs(Number(amount));
    if (!description.trim()) return setError('Inserisci una descrizione.');
    if (!amt) return setError('Inserisci un importo valido.');
    if (!accountId) return setError('Seleziona un conto.');
    if (type === 'transfer' && (!toAccountId || toAccountId === accountId)) return setError('Seleziona un conto di destinazione valido.');
    if (type !== 'transfer' && !categoryId) return setError('Seleziona una categoria.');

    const payload = {
      description: description.trim(),
      amount: amt,
      type,
      accountId,
      categoryId: type === 'transfer' ? null : categoryId,
      toAccountId: type === 'transfer' ? toAccountId : null,
      frequency,
      startDate,
      endDate: endDate || null,
      lastGeneratedDate: initial?.lastGeneratedDate ?? null,
      active: initial?.active ?? true,
    };

    if (initial) updateRecurring(initial.id, payload);
    else addRecurring(payload);
    onClose();
  };

  return (
    <Modal title={initial ? 'Modifica movimento ricorrente' : 'Nuovo movimento ricorrente'} onClose={onClose}>
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
        <div>
          <label className="label">Descrizione</label>
          <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Es. Stipendio, Affitto, Netflix..." />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Importo</label>
            <input type="number" step="0.01" className="input" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div>
            <label className="label">Frequenza</label>
            <select className="input" value={frequency} onChange={(e) => setFrequency(e.target.value as RecurrenceFrequency)}>
              {Object.entries(RECURRENCE_LABELS).map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">{type === 'transfer' ? 'Conto origine' : 'Conto'}</label>
            <select className="input" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              <option value="" disabled>
                Seleziona...
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
              <label className="label">Conto destinazione</label>
              <select className="input" value={toAccountId} onChange={(e) => setToAccountId(e.target.value)}>
                <option value="" disabled>
                  Seleziona...
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
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Data inizio</label>
            <input type="date" className="input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div>
            <label className="label">Data fine (opz.)</label>
            <input type="date" className="input" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
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
