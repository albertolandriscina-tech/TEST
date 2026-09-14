import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Area, CartesianGrid, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowLeft, ArrowDownCircle, ArrowRightLeft, ArrowUpCircle, Pencil, Trash2 } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { ACCOUNT_TYPE_LABELS, LIABILITY_ACCOUNT_TYPES } from '../../types';
import type { Transaction, TransactionType } from '../../types';
import { computeAccountBalance, round2 } from '../../utils/ledger';
import { buildAccountBalanceTrend } from '../../utils/analytics';
import { formatCurrency, formatDate } from '../../utils/format';
import { getAccentColor } from '../../utils/theme';
import { CategoryBadge } from '../common/CategoryBadge';
import { TransactionForm } from '../Transactions/TransactionForm';
import { ConfirmDialog } from '../common/ConfirmDialog';

const typeIcon: Record<TransactionType, JSX.Element> = {
  income: <ArrowUpCircle size={16} className="text-emerald-600" />,
  expense: <ArrowDownCircle size={16} className="text-red-600" />,
  transfer: <ArrowRightLeft size={16} className="text-blue-600" />,
};

export function AccountDetailPage() {
  const { id } = useParams<{ id: string }>();
  const accounts = useStore((s) => s.accounts);
  const transactions = useStore((s) => s.transactions);
  const categories = useStore((s) => s.categories);
  const deleteTransaction = useStore((s) => s.deleteTransaction);
  const accent = getAccentColor(useStore((s) => s.settings.colorTheme));

  const [editing, setEditing] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState<Transaction | null>(null);

  const account = accounts.find((a) => a.id === id);

  const otherAccountName = (accId: string) => accounts.find((a) => a.id === accId)?.name ?? '—';

  const accountTransactions = useMemo(
    () =>
      transactions
        .filter((t) => t.accountId === id || t.toAccountId === id)
        .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)),
    [transactions, id]
  );

  const balance = account ? computeAccountBalance(account, transactions) : 0;
  const trend = useMemo(() => (account ? buildAccountBalanceTrend(account, transactions, 12) : []), [account, transactions]);

  const isLiability = account ? LIABILITY_ACCOUNT_TYPES.includes(account.type) : false;
  const usedCredit = account?.type === 'credit_card' ? Math.max(0, -balance) : 0;
  const availableCredit = account?.creditLimit != null ? round2(account.creditLimit - usedCredit) : null;

  if (!account) {
    return (
      <div className="space-y-4">
        <p className="text-slate-500">Conto non trovato.</p>
        <Link to="/conti" className="text-sm font-medium text-primary-600 hover:underline">
          ← Torna ai conti
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <Link to="/conti" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-primary-600">
          <ArrowLeft size={15} /> Conti
        </Link>
        <div className="flex items-center justify-between flex-wrap gap-3 mt-1">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-800">{account.name}</h1>
            <p className="text-sm text-slate-500">
              {ACCOUNT_TYPE_LABELS[account.type]} · {account.currency}
              {account.archived && ' · Archiviato'}
            </p>
          </div>
          <div className={`text-2xl font-bold ${isLiability || balance < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            {formatCurrency(balance, account.currency)}
          </div>
        </div>
      </div>

      {account.type === 'credit_card' && account.creditLimit != null && (
        <div className="card grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div>
            <span className="text-xs text-slate-400 uppercase">Limite di credito</span>
            <div className="text-lg font-semibold text-slate-700">{formatCurrency(account.creditLimit, account.currency)}</div>
          </div>
          <div>
            <span className="text-xs text-slate-400 uppercase">Utilizzato</span>
            <div className="text-lg font-semibold text-red-600">{formatCurrency(usedCredit, account.currency)}</div>
          </div>
          <div>
            <span className="text-xs text-slate-400 uppercase">Disponibile</span>
            <div className={`text-lg font-semibold ${availableCredit != null && availableCredit < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              {formatCurrency(availableCredit ?? 0, account.currency)}
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <h2 className="font-semibold text-slate-700 text-sm mb-3">Andamento del saldo (ultimi 12 mesi)</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={trend} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="accountBalanceFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={accent} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={accent} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCurrency(v, account.currency)} width={80} domain={['auto', 'auto']} />
              <Tooltip formatter={(v: number) => formatCurrency(v, account.currency)} />
              <Area type="monotone" dataKey="balance" name="Saldo" stroke={accent} strokeWidth={2} fill="url(#accountBalanceFill)" dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card !p-0">
        <h2 className="font-semibold text-slate-700 text-sm px-4 pt-4 pb-2">
          Movimenti collegati <span className="text-slate-400 font-normal">({accountTransactions.length})</span>
        </h2>

        {accountTransactions.length === 0 ? (
          <p className="text-center text-slate-400 py-6">Nessun movimento su questo conto.</p>
        ) : (
          <>
            {/* Vista a card: sotto sm */}
            <div className="sm:hidden space-y-2 p-4 pt-0">
              {accountTransactions.map((t) => (
                <div key={t.id} className="card flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {typeIcon[t.type]}
                      <span className="font-medium text-slate-700 truncate">{t.description}</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5 truncate">
                      {formatDate(t.date)}
                      {t.type === 'transfer' && (
                        <>
                          {' '}
                          ·{' '}
                          {t.accountId === id
                            ? `verso ${otherAccountName(t.toAccountId!)}`
                            : `da ${otherAccountName(t.accountId)}`}
                        </>
                      )}
                    </div>
                    {t.type !== 'transfer' && (
                      <CategoryBadge categoryId={t.categoryId} categories={categories} className="text-xs text-slate-400 mt-0.5" />
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <span
                        className={`font-semibold ${
                          t.type === 'income' || (t.type === 'transfer' && t.toAccountId === id)
                            ? 'text-emerald-600'
                            : t.type === 'expense' || t.type === 'transfer'
                              ? 'text-red-600'
                              : 'text-slate-700'
                        }`}
                      >
                        {t.type === 'income' || (t.type === 'transfer' && t.toAccountId === id) ? '+' : '-'}
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
            <div className="hidden sm:block overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Descrizione</th>
                    <th>Categoria / Conto collegato</th>
                    <th className="text-right">Importo</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {accountTransactions.map((t) => {
                    const isIncomingTransfer = t.type === 'transfer' && t.toAccountId === id;
                    return (
                      <tr key={t.id}>
                        <td className="whitespace-nowrap">{formatDate(t.date)}</td>
                        <td>
                          <div className="flex items-center gap-1.5">
                            {typeIcon[t.type]}
                            <span>{t.description}</span>
                          </div>
                        </td>
                        <td className="text-slate-500">
                          {t.type === 'transfer' ? (
                            isIncomingTransfer ? (
                              `da ${otherAccountName(t.accountId)}`
                            ) : (
                              `verso ${otherAccountName(t.toAccountId!)}`
                            )
                          ) : (
                            <CategoryBadge categoryId={t.categoryId} categories={categories} />
                          )}
                        </td>
                        <td
                          className={`text-right font-semibold whitespace-nowrap ${
                            t.type === 'income' || isIncomingTransfer ? 'text-emerald-600' : 'text-red-600'
                          }`}
                        >
                          {t.type === 'income' || isIncomingTransfer ? '+' : '-'}
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
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

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
    </div>
  );
}
