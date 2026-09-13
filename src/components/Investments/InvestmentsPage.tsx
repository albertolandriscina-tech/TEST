import { useMemo, useState } from 'react';
import { Plus, Trash2, Pencil, ShoppingCart, History } from 'lucide-react';
import { useStore } from '../../store/useStore';
import type { Investment } from '../../types';
import { INVESTMENT_TYPE_LABELS } from '../../types';
import { computeAllHoldings } from '../../utils/ledger';
import { formatCurrency, formatDate, formatNumber } from '../../utils/format';
import { InvestmentForm } from './InvestmentForm';
import { InvestmentTransactionForm } from './InvestmentTransactionForm';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { Modal } from '../common/Modal';

export function InvestmentsPage() {
  const investments = useStore((s) => s.investments);
  const investmentTransactions = useStore((s) => s.investmentTransactions);
  const accounts = useStore((s) => s.accounts);
  const addInvestment = useStore((s) => s.addInvestment);
  const updateInvestment = useStore((s) => s.updateInvestment);
  const deleteInvestment = useStore((s) => s.deleteInvestment);
  const deleteInvestmentTransaction = useStore((s) => s.deleteInvestmentTransaction);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Investment | null>(null);
  const [trading, setTrading] = useState<Investment | null>(null);
  const [historyFor, setHistoryFor] = useState<Investment | null>(null);
  const [deleting, setDeleting] = useState<Investment | null>(null);

  const holdings = useMemo(
    () => computeAllHoldings(investments.filter((i) => !i.archived), investmentTransactions),
    [investments, investmentTransactions]
  );

  const totalValue = holdings.reduce((s, h) => s + h.currentValue, 0);
  const totalCost = holdings.reduce((s, h) => s + h.costBasis, 0);
  const totalGain = totalValue - totalCost;

  const investmentAccounts = accounts.filter((a) => a.type === 'investment');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Investimenti</h1>
          <p className="text-sm text-slate-500">ETF, fondi, azioni e obbligazioni, con conto corrente titoli dedicato.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          <Plus size={16} /> Nuovo strumento
        </button>
      </div>

      {investmentAccounts.length === 0 && (
        <div className="card bg-amber-50 border-amber-200 text-amber-700 text-sm">
          Nessun conto di tipo "Conto titoli / investimenti" trovato. Creane uno nella pagina{' '}
          <strong>Conti</strong> per gestire gli acquisti e le vendite.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="card">
          <span className="text-xs text-slate-400 uppercase">Valore portafoglio</span>
          <div className="text-xl font-semibold text-slate-800">{formatCurrency(totalValue)}</div>
        </div>
        <div className="card">
          <span className="text-xs text-slate-400 uppercase">Capitale investito</span>
          <div className="text-xl font-semibold text-slate-800">{formatCurrency(totalCost)}</div>
        </div>
        <div className="card">
          <span className="text-xs text-slate-400 uppercase">Plus/minusvalenza</span>
          <div className={`text-xl font-semibold ${totalGain >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {formatCurrency(totalGain)}
          </div>
        </div>
      </div>

      <div className="card !p-0 overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Strumento</th>
              <th>Tipo</th>
              <th className="text-right">Quantità</th>
              <th className="text-right">Prezzo medio</th>
              <th className="text-right">Prezzo corrente</th>
              <th className="text-right">Valore</th>
              <th className="text-right">Plus/minus</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {holdings.map(({ investment, quantity, averagePrice, currentValue, gainLoss, gainLossPct }) => (
              <tr key={investment.id}>
                <td>
                  <div className="font-medium text-slate-700">{investment.name}</div>
                  {investment.ticker && <div className="text-xs text-slate-400">{investment.ticker}</div>}
                </td>
                <td>{INVESTMENT_TYPE_LABELS[investment.type]}</td>
                <td className="text-right">{formatNumber(quantity, 4)}</td>
                <td className="text-right">{formatCurrency(averagePrice)}</td>
                <td className="text-right">
                  <input
                    type="number"
                    step="0.0001"
                    className="input !w-24 !py-1 text-right ml-auto"
                    value={investment.currentPrice}
                    onChange={(e) => updateInvestment(investment.id, { currentPrice: Number(e.target.value) || 0 })}
                  />
                </td>
                <td className="text-right font-medium">{formatCurrency(currentValue)}</td>
                <td className={`text-right font-medium ${gainLoss >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatCurrency(gainLoss)}{' '}
                  <span className="text-xs">({formatNumber(gainLossPct, 1)}%)</span>
                </td>
                <td>
                  <div className="flex justify-end gap-1">
                    <button className="btn-ghost !p-1.5" title="Acquista/Vendi" onClick={() => setTrading(investment)}>
                      <ShoppingCart size={14} />
                    </button>
                    <button className="btn-ghost !p-1.5" title="Storico operazioni" onClick={() => setHistoryFor(investment)}>
                      <History size={14} />
                    </button>
                    <button className="btn-ghost !p-1.5" title="Modifica" onClick={() => setEditing(investment)}>
                      <Pencil size={14} />
                    </button>
                    <button className="btn-ghost !p-1.5 text-red-500" title="Elimina" onClick={() => setDeleting(investment)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {holdings.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center text-slate-400 py-6">
                  Nessuno strumento finanziario. Aggiungine uno per iniziare.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && <InvestmentForm onClose={() => setShowForm(false)} onSave={addInvestment} />}
      {editing && (
        <InvestmentForm initial={editing} onClose={() => setEditing(null)} onSave={(data) => updateInvestment(editing.id, data)} />
      )}
      {trading && <InvestmentTransactionForm investment={trading} onClose={() => setTrading(null)} />}
      {historyFor && (
        <Modal title={`Storico operazioni — ${historyFor.name}`} onClose={() => setHistoryFor(null)} width="max-w-2xl">
          <div className="overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>Data</th>
                <th>Tipo</th>
                <th className="text-right">Quantità</th>
                <th className="text-right">Prezzo</th>
                <th className="text-right">Commissioni</th>
                <th className="text-right">Totale</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {investmentTransactions
                .filter((it) => it.investmentId === historyFor.id)
                .sort((a, b) => b.date.localeCompare(a.date))
                .map((it) => (
                  <tr key={it.id}>
                    <td>{formatDate(it.date)}</td>
                    <td className={it.type === 'buy' ? 'text-emerald-600' : 'text-red-600'}>
                      {it.type === 'buy' ? 'Acquisto' : 'Vendita'}
                    </td>
                    <td className="text-right">{formatNumber(it.quantity, 4)}</td>
                    <td className="text-right">{formatCurrency(it.price)}</td>
                    <td className="text-right">{formatCurrency(it.fees)}</td>
                    <td className="text-right font-medium">
                      {formatCurrency(it.quantity * it.price + (it.type === 'buy' ? it.fees : -it.fees))}
                    </td>
                    <td>
                      <button className="btn-ghost !p-1.5 text-red-500" onClick={() => deleteInvestmentTransaction(it.id)}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              {investmentTransactions.filter((it) => it.investmentId === historyFor.id).length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center text-slate-400 py-4">
                    Nessuna operazione registrata.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </Modal>
      )}
      {deleting && (
        <ConfirmDialog
          title="Elimina strumento"
          message={`Eliminare "${deleting.name}"? Verranno eliminate anche tutte le operazioni di acquisto/vendita collegate.`}
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            deleteInvestment(deleting.id);
            setDeleting(null);
          }}
        />
      )}
    </div>
  );
}
