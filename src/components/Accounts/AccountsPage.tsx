import { useMemo, useState } from 'react';
import { Archive, ArchiveRestore, Plus, Trash2, Pencil } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { ACCOUNT_TYPE_LABELS } from '../../types';
import type { Account } from '../../types';
import { computeAllAccountBalances } from '../../utils/ledger';
import { formatCurrency } from '../../utils/format';
import { AccountForm } from './AccountForm';
import { ConfirmDialog } from '../common/ConfirmDialog';

export function AccountsPage() {
  const accounts = useStore((s) => s.accounts);
  const transactions = useStore((s) => s.transactions);
  const addAccount = useStore((s) => s.addAccount);
  const updateAccount = useStore((s) => s.updateAccount);
  const deleteAccount = useStore((s) => s.deleteAccount);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [deleting, setDeleting] = useState<Account | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const balances = useMemo(() => computeAllAccountBalances(accounts, transactions), [accounts, transactions]);

  const visibleAccounts = accounts.filter((a) => showArchived || !a.archived);
  const total = visibleAccounts.reduce((s, a) => s + (balances[a.id] ?? 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Conti</h1>
          <p className="text-sm text-slate-500">Conti bancari, contanti, titoli e carte di credito.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          <Plus size={16} /> Nuovo conto
        </button>
      </div>

      <div className="card flex items-center justify-between flex-wrap gap-2">
        <span className="text-sm text-slate-500">Saldo totale conti visualizzati</span>
        <span className={`text-xl font-semibold ${total >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
          {formatCurrency(total)}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2 text-sm text-slate-500">
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
          Mostra conti archiviati
        </label>
      </div>

      <div className="card !p-0 overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Tipo</th>
              <th>Valuta</th>
              <th className="text-right">Saldo</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {visibleAccounts.map((acc) => {
              const bal = balances[acc.id] ?? 0;
              return (
                <tr key={acc.id} className={acc.archived ? 'opacity-50' : ''}>
                  <td className="font-medium text-slate-700">{acc.name}</td>
                  <td>{ACCOUNT_TYPE_LABELS[acc.type]}</td>
                  <td>{acc.currency}</td>
                  <td className={`text-right font-semibold ${bal >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {formatCurrency(bal, acc.currency)}
                  </td>
                  <td>
                    <div className="flex justify-end gap-1">
                      <button className="btn-ghost !p-1.5" title="Modifica" onClick={() => setEditing(acc)}>
                        <Pencil size={15} />
                      </button>
                      <button
                        className="btn-ghost !p-1.5"
                        title={acc.archived ? 'Riattiva' : 'Archivia'}
                        onClick={() => updateAccount(acc.id, { archived: !acc.archived })}
                      >
                        {acc.archived ? <ArchiveRestore size={15} /> : <Archive size={15} />}
                      </button>
                      <button className="btn-ghost !p-1.5 text-red-500" title="Elimina" onClick={() => setDeleting(acc)}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {visibleAccounts.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center text-slate-400 py-6">
                  Nessun conto. Crea il primo conto per iniziare.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <AccountForm onClose={() => setShowForm(false)} onSave={(data) => addAccount(data)} />
      )}
      {editing && (
        <AccountForm
          initial={editing}
          onClose={() => setEditing(null)}
          onSave={(data) => updateAccount(editing.id, data)}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Elimina conto"
          message={`Eliminare il conto "${deleting.name}"? Verranno eliminati anche tutti i movimenti collegati.`}
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            deleteAccount(deleting.id);
            setDeleting(null);
          }}
        />
      )}
    </div>
  );
}
