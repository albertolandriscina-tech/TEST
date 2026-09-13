import { useMemo, useState } from 'react';
import { Plus, Trash2, Pencil, ShoppingCart, History, RefreshCw } from 'lucide-react';
import { useStore } from '../../store/useStore';
import type { Investment } from '../../types';
import { INVESTMENT_TYPE_LABELS } from '../../types';
import { computeAllHoldings } from '../../utils/ledger';
import { formatCurrency, formatDate, formatDateTime, formatNumber } from '../../utils/format';
import { InvestmentForm } from './InvestmentForm';
import { InvestmentTransactionForm } from './InvestmentTransactionForm';
import { PortfolioAnalysis } from './PortfolioAnalysis';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { Modal } from '../common/Modal';

function QuoteSourceBadge({ investment }: { investment: Investment }) {
  if (!investment.lastUpdated) return null;
  return (
    <div className="text-[10px] text-slate-400 mt-0.5">
      {formatDateTime(investment.lastUpdated)}
      {investment.quoteSource && (
        <span className={`ml-1 font-medium ${investment.quoteSource === 'live' ? 'text-emerald-600' : 'text-amber-600'}`}>
          {investment.quoteSource === 'live' ? '· Live' : '· Simulato'}
        </span>
      )}
    </div>
  );
}

export function InvestmentsPage() {
  const investments = useStore((s) => s.investments);
  const investmentTransactions = useStore((s) => s.investmentTransactions);
  const accounts = useStore((s) => s.accounts);
  const portfolioSnapshots = useStore((s) => s.portfolioSnapshots);
  const addInvestment = useStore((s) => s.addInvestment);
  const updateInvestment = useStore((s) => s.updateInvestment);
  const deleteInvestment = useStore((s) => s.deleteInvestment);
  const deleteInvestmentTransaction = useStore((s) => s.deleteInvestmentTransaction);
  const refreshInvestmentPrices = useStore((s) => s.refreshInvestmentPrices);

  const [tab, setTab] = useState<'portafoglio' | 'analisi'>('portafoglio');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Investment | null>(null);
  const [trading, setTrading] = useState<Investment | null>(null);
  const [historyFor, setHistoryFor] = useState<Investment | null>(null);
  const [deleting, setDeleting] = useState<Investment | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const holdings = useMemo(
    () => computeAllHoldings(investments.filter((i) => !i.archived), investmentTransactions),
    [investments, investmentTransactions]
  );

  const totalValue = holdings.reduce((s, h) => s + h.currentValue, 0);
  const totalCost = holdings.reduce((s, h) => s + h.costBasis, 0);
  const totalGain = totalValue - totalCost;

  const investmentAccounts = accounts.filter((a) => a.type === 'investment');

  const lastUpdated = investments
    .map((i) => i.lastUpdated)
    .filter((d): d is string => !!d)
    .sort()
    .pop();

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshInvestmentPrices();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Investimenti</h1>
          <p className="text-sm text-slate-500">ETF, fondi, azioni e obbligazioni, con conto corrente titoli dedicato.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button className="btn-secondary" onClick={handleRefresh} disabled={holdings.length === 0}>
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} /> Aggiorna quotazioni
          </button>
          <button className="btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={16} /> Nuovo strumento
          </button>
        </div>
      </div>

      <div className="card bg-primary-50 border-primary-100 text-primary-700 text-xs sm:text-sm">
        "Aggiorna quotazioni" tenta di recuperare il prezzo reale da <strong>Yahoo Finance</strong> per gli
        strumenti con un ticker Yahoo valido (es. <code>AAPL</code>, <code>G.MI</code>, <code>SWDA.MI</code>).
        Se la richiesta non è disponibile — assenza di ticker, di connessione, o restrizioni CORS/di rete
        del browser o dell'hosting, come nell'anteprima di questo Artifact — il prezzo viene aggiornato con
        una simulazione realistica di fallback. Ogni strumento mostra l'origine dell'ultimo aggiornamento
        (<span className="font-medium">Live</span> / <span className="font-medium">Simulato</span>). Puoi
        comunque impostare in qualsiasi momento un prezzo manuale.
        {lastUpdated && (
          <div className="mt-1 text-primary-500">Ultimo aggiornamento: {formatDateTime(lastUpdated)}</div>
        )}
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

      <div className="flex gap-1 border-b border-slate-200">
        <button
          className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
            tab === 'portafoglio' ? 'border-primary-500 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
          onClick={() => setTab('portafoglio')}
        >
          Portafoglio
        </button>
        <button
          className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
            tab === 'analisi' ? 'border-primary-500 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
          onClick={() => setTab('analisi')}
        >
          Analisi del portafoglio
        </button>
      </div>

      {tab === 'analisi' && <PortfolioAnalysis holdings={holdings} snapshots={portfolioSnapshots} />}

      {tab === 'portafoglio' && (
      <>
      {holdings.length === 0 && (
        <div className="card text-center text-slate-400 py-6">Nessuno strumento finanziario. Aggiungine uno per iniziare.</div>
      )}

      {/* Vista a card: sotto sm */}
      <div className="sm:hidden space-y-2">
        {holdings.map(({ investment, quantity, averagePrice, currentValue, gainLoss, gainLossPct }) => (
          <div key={investment.id} className="card">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium text-slate-700 truncate">{investment.name}</div>
                <div className="text-xs text-slate-400 truncate">
                  {INVESTMENT_TYPE_LABELS[investment.type]}
                  {investment.ticker && ` · ${investment.ticker}`}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
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
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
              <div>
                <div className="text-xs text-slate-400">Quantità</div>
                <div>{formatNumber(quantity, 4)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Prezzo medio</div>
                <div>{formatCurrency(averagePrice)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Prezzo corrente</div>
                <input
                  type="number"
                  step="0.0001"
                  className="input !w-24 !py-1"
                  value={investment.currentPrice}
                  onChange={(e) => updateInvestment(investment.id, { currentPrice: Number(e.target.value) || 0 })}
                />
                <QuoteSourceBadge investment={investment} />
              </div>
              <div>
                <div className="text-xs text-slate-400">Valore</div>
                <div className="font-medium">{formatCurrency(currentValue)}</div>
              </div>
            </div>
            <div className={`mt-2 text-sm font-medium ${gainLoss >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {formatCurrency(gainLoss)} ({formatNumber(gainLossPct, 1)}%)
            </div>
          </div>
        ))}
      </div>

      {/* Vista a tabella: da sm in su */}
      <div className="hidden sm:block card !p-0 overflow-x-auto">
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
                  <QuoteSourceBadge investment={investment} />
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
          </tbody>
        </table>
      </div>
      </>
      )}

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
