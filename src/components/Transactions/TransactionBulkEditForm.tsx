import { useMemo, useState } from 'react';
import { shallow } from 'zustand/shallow';
import type { CategoryKind, Transaction } from '../../types';
import { useStore } from '../../store/useStore';
import { Modal } from '../common/Modal';
import { CategorySelect } from '../common/CategorySelect';

interface TransactionBulkEditFormProps {
  ids: string[];
  transactions: Transaction[];
  onClose: () => void;
}

export function TransactionBulkEditForm({ ids, transactions, onClose }: TransactionBulkEditFormProps) {
  const accounts = useStore((s) => s.accounts.filter((a) => !a.archived), shallow);
  const categories = useStore((s) => s.categories);
  const updateTransactions = useStore((s) => s.updateTransactions);

  const hasTransfer = useMemo(() => transactions.some((t) => t.type === 'transfer'), [transactions]);
  // La categoria si può cambiare in blocco solo se i movimenti non-giroconto selezionati
  // sono tutti dello stesso tipo (entrata o uscita): una categoria ha sempre un unico "kind".
  const categoryKind = useMemo<CategoryKind | null>(() => {
    const kinds = new Set(transactions.filter((t) => t.type !== 'transfer').map((t) => t.type));
    return kinds.size === 1 ? ([...kinds][0] as CategoryKind) : null;
  }, [transactions]);

  const [applyAccount, setApplyAccount] = useState(false);
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '');
  const [applyCategory, setApplyCategory] = useState(false);
  const [categoryId, setCategoryId] = useState('');
  const [applyDate, setApplyDate] = useState(false);
  const [date, setDate] = useState('');
  const [applyNote, setApplyNote] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    if (!applyAccount && !applyCategory && !applyDate && !applyNote) {
      setError('Seleziona almeno un campo da modificare.');
      return;
    }
    if (applyAccount && !accountId) {
      setError('Seleziona un conto.');
      return;
    }
    if (applyCategory && !categoryId) {
      setError('Seleziona una categoria.');
      return;
    }
    if (applyDate && !date) {
      setError('Seleziona una data.');
      return;
    }

    updateTransactions(ids, {
      ...(applyAccount && { accountId }),
      ...(applyCategory && { categoryId }),
      ...(applyDate && { date }),
      ...(applyNote && { note: note.trim() }),
    });
    onClose();
  };

  return (
    <Modal title={`Modifica ${ids.length} movimenti selezionati`} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-slate-500">
          Spunta i campi da cambiare: verranno sovrascritti su tutti i movimenti selezionati. I campi non
          spuntati restano invariati.
        </p>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input type="checkbox" checked={applyAccount} onChange={(e) => setApplyAccount(e.target.checked)} />
            Cambia conto
          </label>
          {applyAccount && (
            <div className="pl-6 space-y-1">
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
              {hasTransfer && (
                <p className="text-xs text-slate-400">Per i giroconti verrà cambiato solo il conto di partenza.</p>
              )}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label
            className={`flex items-center gap-2 text-sm font-medium ${
              categoryKind ? 'text-slate-700' : 'text-slate-300'
            }`}
          >
            <input
              type="checkbox"
              checked={applyCategory}
              disabled={!categoryKind}
              onChange={(e) => setApplyCategory(e.target.checked)}
            />
            Cambia categoria
          </label>
          {categoryKind ? (
            applyCategory && (
              <div className="pl-6">
                <CategorySelect categories={categories} kind={categoryKind} value={categoryId} onChange={setCategoryId} />
              </div>
            )
          ) : (
            <p className="pl-6 text-xs text-slate-400">
              Disponibile solo se i movimenti selezionati (esclusi i giroconti) sono tutti entrate oppure tutti
              uscite.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input type="checkbox" checked={applyDate} onChange={(e) => setApplyDate(e.target.checked)} />
            Cambia data
          </label>
          {applyDate && (
            <div className="pl-6">
              <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input type="checkbox" checked={applyNote} onChange={(e) => setApplyNote(e.target.checked)} />
            Cambia nota
          </label>
          {applyNote && (
            <div className="pl-6">
              <input
                className="input"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Lascia vuoto per rimuovere la nota"
              />
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button className="btn-secondary" onClick={onClose}>
            Annulla
          </button>
          <button className="btn-primary" onClick={submit}>
            Applica a {ids.length} movimenti
          </button>
        </div>
      </div>
    </Modal>
  );
}
