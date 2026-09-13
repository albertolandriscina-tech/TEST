import { useState } from 'react';
import type { Account, AccountType } from '../../types';
import { ACCOUNT_TYPE_LABELS } from '../../types';
import { todayISO } from '../../utils/id';
import { Modal } from '../common/Modal';

interface AccountFormProps {
  initial?: Account;
  onSave: (data: Omit<Account, 'id' | 'createdAt'>) => void;
  onClose: () => void;
}

export function AccountForm({ initial, onSave, onClose }: AccountFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [type, setType] = useState<AccountType>(initial?.type ?? 'bank');
  const [initialBalance, setInitialBalance] = useState(String(initial?.initialBalance ?? 0));
  const [initialBalanceDate, setInitialBalanceDate] = useState(initial?.initialBalanceDate ?? todayISO());
  const [currency, setCurrency] = useState(initial?.currency ?? 'EUR');
  const [note, setNote] = useState(initial?.note ?? '');

  const submit = () => {
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      type,
      initialBalance: Number(initialBalance) || 0,
      initialBalanceDate: initialBalanceDate || undefined,
      currency,
      note: note.trim() || undefined,
      archived: initial?.archived ?? false,
    });
    onClose();
  };

  return (
    <Modal title={initial ? 'Modifica conto' : 'Nuovo conto'} onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="label">Nome conto</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Es. Conto corrente principale" />
        </div>
        <div>
          <label className="label">Tipo</label>
          <select className="input" value={type} onChange={(e) => setType(e.target.value as AccountType)}>
            {Object.entries(ACCOUNT_TYPE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Saldo iniziale</label>
            <input
              className="input"
              type="number"
              step="0.01"
              value={initialBalance}
              onChange={(e) => setInitialBalance(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Saldo iniziale al</label>
            <input
              className="input"
              type="date"
              value={initialBalanceDate}
              max={todayISO()}
              onChange={(e) => setInitialBalanceDate(e.target.value)}
            />
          </div>
        </div>
        <p className="text-xs text-slate-400 -mt-2">
          I movimenti inseriti con data precedente a questa non verranno sommati al saldo, per evitare di
          conteggiarli due volte.
        </p>
        <div>
          <label className="label">Valuta</label>
          <input className="input" value={currency} onChange={(e) => setCurrency(e.target.value)} />
        </div>
        <div>
          <label className="label">Note (opzionale)</label>
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
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
