import { useMemo, useState } from 'react';
import { Plus, Trash2, Pencil, ArrowDownCircle, ArrowUpCircle, ArrowRightLeft, Download, Upload } from 'lucide-react';
import { useStore } from '../../store/useStore';
import type { Transaction, TransactionType } from '../../types';
import { formatCurrency, formatDate } from '../../utils/format';
import { getCategoryPath } from '../../utils/ledger';
import { downloadTextFile, transactionsToCSV } from '../../utils/csv';
import { TransactionForm } from './TransactionForm';
import { ImportTransactionsModal } from './ImportTransactionsModal';
import { ConfirmDialog } from '../common/ConfirmDialog';

const typeIcon: Record<TransactionType, JSX.Element> = {
  income: <ArrowUpCircle size={16} className="text-emerald-600" />,
  expense: <ArrowDownCircle size={16} className="text-red-600" />,
  transfer: <ArrowRightLeft size={16} className="text-blue-600" />,
};

export function TransactionsPage() {
  const transactions = useStore((s) => s.transactions);
  const accounts = useStore((s) => s.accounts);
  const categories = useStore((s) => s.categories);
  const deleteTransaction = useStore((s) => s.deleteTransaction);
  const deleteTransactions = useStore((s) => s.deleteTransactions);
  const selectedIds = useStore((s) => s.selectedTransactionIds);
  const toggleSelect = useStore((s) => s.toggleSelectTransaction);
  const selectAll = useStore((s) => s.selectAllTransactions);
  const clearSelection = useStore((s) => s.clearSelection);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState<Transaction | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const [filterAccount, setFilterAccount] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [search, setSearch] = useState('');

  const accountName = (id: string) => accounts.find((a) => a.id === id)?.name ?? '—';

  const filtered = useMemo(() => {
    return transactions
      .filter((t) => !filterAccount || t.accountId === filterAccount || t.toAccountId === filterAccount)
      .filter((t) => !filterType || t.type === filterType)
      .filter((t) => !filterMonth || t.date.startsWith(filterMonth))
      .filter((t) => !search || t.description.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  }, [transactions, filterAccount, filterType, filterMonth, search]);

  const allVisibleSelected = filtered.length > 0 && filtered.every((t) => selectedIds.includes(t.id));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Movimenti</h1>
          <p className="text-sm text-slate-500">
            Inserisci solo l'importo positivo: entrata/uscita/giroconto vengono riconosciuti automaticamente.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button className="btn-secondary" onClick={() => setShowImport(true)}>
            <Upload size={15} /> Importa CSV
          </button>
          <button
            className="btn-secondary"
            onClick={() => {
              const csv = transactionsToCSV(filtered, accounts, categories);
              downloadTextFile(`movimenti-${new Date().toISOString().slice(0, 10)}.csv`, csv);
            }}
            disabled={filtered.length === 0}
          >
            <Download size={15} /> Esporta CSV
          </button>
          <button className="btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={16} /> Nuovo movimento
          </button>
        </div>
      </div>

      <div className="card flex flex-wrap gap-3 items-end">
        <div>
          <label className="label">Mese</label>
          <input type="month" className="input" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} />
        </div>
        <div>
          <label className="label">Conto</label>
          <select className="input" value={filterAccount} onChange={(e) => setFilterAccount(e.target.value)}>
            <option value="">Tutti</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Tipo</label>
          <select className="input" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="">Tutti</option>
            <option value="income">Entrata</option>
            <option value="expense">Uscita</option>
            <option value="transfer">Giroconto</option>
          </select>
        </div>
        <div className="flex-1 min-w-[160px]">
          <label className="label">Cerca descrizione</label>
          <input className="input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cerca..." />
        </div>
        {(filterMonth || filterAccount || filterType || search) && (
          <button
            className="btn-ghost"
            onClick={() => {
              setFilterMonth('');
              setFilterAccount('');
              setFilterType('');
              setSearch('');
            }}
          >
            Reset filtri
          </button>
        )}
      </div>

      {selectedIds.length > 0 && (
        <div className="card !py-2 flex items-center justify-between bg-indigo-50 border-indigo-200">
          <span className="text-sm text-indigo-700 font-medium">{selectedIds.length} movimenti selezionati</span>
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={clearSelection}>
              Deseleziona
            </button>
            <button className="btn-danger" onClick={() => setBulkDeleting(true)}>
              <Trash2 size={14} /> Elimina selezionati
            </button>
          </div>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="card text-center text-slate-400 py-6">Nessun movimento trovato.</div>
      )}

      {filtered.length > 0 && (
        <label className="sm:hidden flex items-center gap-2 text-sm text-slate-500 px-1">
          <input
            type="checkbox"
            checked={allVisibleSelected}
            onChange={(e) => (e.target.checked ? selectAll(filtered.map((t) => t.id)) : clearSelection())}
          />
          Seleziona tutti
        </label>
      )}

      {/* Vista a card: sotto sm */}
      <div className="sm:hidden space-y-2">
        {filtered.map((t) => (
          <div key={t.id} className={`card flex items-start gap-3 ${selectedIds.includes(t.id) ? 'bg-indigo-50/50 border-indigo-200' : ''}`}>
            <input
              type="checkbox"
              className="mt-1 shrink-0"
              checked={selectedIds.includes(t.id)}
              onChange={() => toggleSelect(t.id)}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 min-w-0">
                {typeIcon[t.type]}
                <span className="font-medium text-slate-700 truncate">{t.description}</span>
              </div>
              <div className="text-xs text-slate-400 mt-0.5 truncate">
                {formatDate(t.date)} ·{' '}
                {t.type === 'transfer' ? `${accountName(t.accountId)} → ${accountName(t.toAccountId!)}` : accountName(t.accountId)}
              </div>
              {t.type !== 'transfer' && (
                <div className="text-xs text-slate-400 truncate">{getCategoryPath(t.categoryId, categories)}</div>
              )}
              <div className="flex items-center justify-between mt-2">
                <span
                  className={`font-semibold ${
                    t.type === 'income' ? 'text-emerald-600' : t.type === 'expense' ? 'text-red-600' : 'text-blue-600'
                  }`}
                >
                  {t.type === 'income' ? '+' : t.type === 'expense' ? '-' : ''}
                  {formatCurrency(t.amount)}
                </span>
                <div className="flex gap-1">
                  <button className="btn-ghost !p-1.5" onClick={() => setEditing(t)}>
                    <Pencil size={14} />
                  </button>
                  <button className="btn-ghost !p-1.5 text-red-500" onClick={() => setDeleting(t)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Vista a tabella: da sm in su */}
      <div className="hidden sm:block card !p-0 overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th className="w-8">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={(e) => (e.target.checked ? selectAll(filtered.map((t) => t.id)) : clearSelection())}
                />
              </th>
              <th>Data</th>
              <th>Descrizione</th>
              <th>Conto</th>
              <th>Categoria</th>
              <th className="text-right">Importo</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => (
              <tr key={t.id} className={selectedIds.includes(t.id) ? 'bg-indigo-50/50' : ''}>
                <td>
                  <input type="checkbox" checked={selectedIds.includes(t.id)} onChange={() => toggleSelect(t.id)} />
                </td>
                <td className="whitespace-nowrap">{formatDate(t.date)}</td>
                <td>
                  <div className="flex items-center gap-1.5">
                    {typeIcon[t.type]}
                    <span>{t.description}</span>
                  </div>
                </td>
                <td className="text-slate-500">
                  {t.type === 'transfer' ? `${accountName(t.accountId)} → ${accountName(t.toAccountId!)}` : accountName(t.accountId)}
                </td>
                <td className="text-slate-500">{t.type === 'transfer' ? '—' : getCategoryPath(t.categoryId, categories)}</td>
                <td
                  className={`text-right font-semibold whitespace-nowrap ${
                    t.type === 'income' ? 'text-emerald-600' : t.type === 'expense' ? 'text-red-600' : 'text-blue-600'
                  }`}
                >
                  {t.type === 'income' ? '+' : t.type === 'expense' ? '-' : ''}
                  {formatCurrency(t.amount)}
                </td>
                <td>
                  <div className="flex justify-end gap-1">
                    <button className="btn-ghost !p-1.5" onClick={() => setEditing(t)}>
                      <Pencil size={14} />
                    </button>
                    <button className="btn-ghost !p-1.5 text-red-500" onClick={() => setDeleting(t)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showImport && <ImportTransactionsModal onClose={() => setShowImport(false)} />}
      {showForm && <TransactionForm onClose={() => setShowForm(false)} />}
      {editing && <TransactionForm initial={editing} onClose={() => setEditing(null)} />}
      {deleting && (
        <ConfirmDialog
          title="Elimina movimento"
          message={`Eliminare il movimento "${deleting.description}"?`}
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            deleteTransaction(deleting.id);
            setDeleting(null);
          }}
        />
      )}
      {bulkDeleting && (
        <ConfirmDialog
          title="Elimina movimenti selezionati"
          message={`Eliminare i ${selectedIds.length} movimenti selezionati? L'operazione non è reversibile.`}
          onCancel={() => setBulkDeleting(false)}
          onConfirm={() => {
            deleteTransactions(selectedIds);
            setBulkDeleting(false);
          }}
        />
      )}
    </div>
  );
}
