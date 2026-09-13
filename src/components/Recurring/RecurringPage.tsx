import { useState } from 'react';
import { Plus, Trash2, Pencil, Play, Pause, RefreshCcw } from 'lucide-react';
import { useStore } from '../../store/useStore';
import type { RecurringTransaction } from '../../types';
import { RECURRENCE_LABELS, TRANSACTION_TYPE_LABELS } from '../../types';
import { formatCurrency, formatDate } from '../../utils/format';
import { RecurringForm } from './RecurringForm';
import { ConfirmDialog } from '../common/ConfirmDialog';

export function RecurringPage() {
  const rules = useStore((s) => s.recurringTransactions);
  const accounts = useStore((s) => s.accounts);
  const updateRecurring = useStore((s) => s.updateRecurring);
  const deleteRecurring = useStore((s) => s.deleteRecurring);
  const generateDueRecurring = useStore((s) => s.generateDueRecurring);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<RecurringTransaction | null>(null);
  const [deleting, setDeleting] = useState<RecurringTransaction | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const accountName = (id: string) => accounts.find((a) => a.id === id)?.name ?? '—';

  const runNow = () => {
    const n = generateDueRecurring();
    setMessage(n > 0 ? `Generati ${n} movimenti.` : 'Nessun movimento da generare al momento.');
    setTimeout(() => setMessage(null), 4000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-800">Movimenti ricorrenti</h1>
          <p className="text-sm text-slate-500">
            Definisci entrate, uscite o giroconti che si ripetono; verranno generati automaticamente all'apertura dell'app.
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={runNow}>
            <RefreshCcw size={15} /> Genera ora
          </button>
          <button className="btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={16} /> Nuovo ricorrente
          </button>
        </div>
      </div>

      {message && <div className="card bg-primary-50 border-primary-200 text-primary-700 text-sm">{message}</div>}

      {rules.length === 0 && (
        <div className="card text-center text-slate-400 py-6">Nessun movimento ricorrente configurato.</div>
      )}

      {/* Vista a card: sotto sm */}
      <div className="sm:hidden space-y-2">
        {rules.map((r) => (
          <div key={r.id} className={`card ${!r.active ? 'opacity-50' : ''}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium text-slate-700 truncate">{r.description}</div>
                <div className="text-xs text-slate-400 truncate">
                  {TRANSACTION_TYPE_LABELS[r.type]} ·{' '}
                  {r.type === 'transfer' ? `${accountName(r.accountId)} → ${accountName(r.toAccountId!)}` : accountName(r.accountId)}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  className="btn-ghost !p-1.5"
                  title={r.active ? 'Metti in pausa' : 'Riattiva'}
                  onClick={() => updateRecurring(r.id, { active: !r.active })}
                >
                  {r.active ? <Pause size={14} /> : <Play size={14} />}
                </button>
                <button className="btn-ghost !p-1.5" onClick={() => setEditing(r)}>
                  <Pencil size={14} />
                </button>
                <button className="btn-ghost !p-1.5 text-red-500" onClick={() => setDeleting(r)}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between mt-2 text-sm">
              <span className="text-slate-500">
                {RECURRENCE_LABELS[r.frequency]} · {r.lastGeneratedDate ? formatDate(r.lastGeneratedDate) : 'Mai generato'}
              </span>
              <span className="font-semibold text-slate-700">{formatCurrency(r.amount)}</span>
            </div>
            <span className={`badge mt-2 ${r.active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
              {r.active ? 'Attivo' : 'In pausa'}
            </span>
          </div>
        ))}
      </div>

      {/* Vista a tabella: da sm in su */}
      <div className="hidden sm:block card !p-0 overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Descrizione</th>
              <th>Tipo</th>
              <th>Conto</th>
              <th>Frequenza</th>
              <th>Ultima generazione</th>
              <th className="text-right">Importo</th>
              <th>Stato</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rules.map((r) => (
              <tr key={r.id} className={!r.active ? 'opacity-50' : ''}>
                <td className="font-medium text-slate-700">{r.description}</td>
                <td>{TRANSACTION_TYPE_LABELS[r.type]}</td>
                <td className="text-slate-500">
                  {r.type === 'transfer' ? `${accountName(r.accountId)} → ${accountName(r.toAccountId!)}` : accountName(r.accountId)}
                </td>
                <td>{RECURRENCE_LABELS[r.frequency]}</td>
                <td>{r.lastGeneratedDate ? formatDate(r.lastGeneratedDate) : 'Mai'}</td>
                <td className="text-right font-medium">{formatCurrency(r.amount)}</td>
                <td>
                  <span className={`badge ${r.active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                    {r.active ? 'Attivo' : 'In pausa'}
                  </span>
                </td>
                <td>
                  <div className="flex justify-end gap-1">
                    <button
                      className="btn-ghost !p-1.5"
                      title={r.active ? 'Metti in pausa' : 'Riattiva'}
                      onClick={() => updateRecurring(r.id, { active: !r.active })}
                    >
                      {r.active ? <Pause size={14} /> : <Play size={14} />}
                    </button>
                    <button className="btn-ghost !p-1.5" onClick={() => setEditing(r)}>
                      <Pencil size={14} />
                    </button>
                    <button className="btn-ghost !p-1.5 text-red-500" onClick={() => setDeleting(r)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && <RecurringForm onClose={() => setShowForm(false)} />}
      {editing && <RecurringForm initial={editing} onClose={() => setEditing(null)} />}
      {deleting && (
        <ConfirmDialog
          title="Elimina movimento ricorrente"
          message={`Eliminare la regola "${deleting.description}"? I movimenti già generati non verranno rimossi.`}
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            deleteRecurring(deleting.id);
            setDeleting(null);
          }}
        />
      )}
    </div>
  );
}
