import { useMemo } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { ACCOUNT_TYPE_LABELS, ASSET_CATEGORY_LABELS } from '../../types';
import { computeAllAccountBalances, computeAllHoldings, computeNetWorth, computeQuadratura } from '../../utils/ledger';
import { formatCurrency } from '../../utils/format';

export function BalanceSheetPage() {
  const accounts = useStore((s) => s.accounts);
  const transactions = useStore((s) => s.transactions);
  const categories = useStore((s) => s.categories);
  const investments = useStore((s) => s.investments);
  const investmentTransactions = useStore((s) => s.investmentTransactions);
  const patrimonioAssets = useStore((s) => s.patrimonioAssets);

  const balances = useMemo(() => computeAllAccountBalances(accounts, transactions), [accounts, transactions]);
  const holdings = useMemo(() => computeAllHoldings(investments, investmentTransactions), [investments, investmentTransactions]);
  const netWorth = useMemo(
    () => computeNetWorth(accounts, transactions, holdings, patrimonioAssets),
    [accounts, transactions, holdings, patrimonioAssets]
  );
  const quadratura = useMemo(
    () => computeQuadratura(accounts, transactions, categories),
    [accounts, transactions, categories]
  );

  const attivi = accounts.filter((a) => (balances[a.id] ?? 0) >= 0);
  const passivi = accounts.filter((a) => (balances[a.id] ?? 0) < 0);

  const totaleAttivita = netWorth.liquidita + netWorth.investimenti + netWorth.patrimonioImmobiliare;
  const totalePassivita = netWorth.debiti;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Bilancio e quadratura</h1>
        <p className="text-sm text-slate-500">Stato patrimoniale complessivo e controllo di quadratura della partita doppia.</p>
      </div>

      <div className={`card flex items-center gap-3 ${quadratura.quadra && quadratura.quadraMetodi ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
        {quadratura.quadra && quadratura.quadraMetodi ? (
          <CheckCircle2 className="text-emerald-600" size={28} />
        ) : (
          <XCircle className="text-red-600" size={28} />
        )}
        <div>
          <div className={`font-semibold ${quadratura.quadra && quadratura.quadraMetodi ? 'text-emerald-700' : 'text-red-700'}`}>
            {quadratura.quadra && quadratura.quadraMetodi ? 'Il bilancio quadra correttamente' : 'Attenzione: il bilancio non quadra'}
          </div>
          <div className="text-sm text-slate-500">
            Totale Dare {formatCurrency(quadratura.totaleDare)} · Totale Avere {formatCurrency(quadratura.totaleAvere)} · Differenza{' '}
            {formatCurrency(quadratura.differenza)}
          </div>
          <div className="text-sm text-slate-500">
            Verifica indipendente (saldi per conto vs. flussi aggregati): {formatCurrency(quadratura.metodoPerConto)} vs.{' '}
            {formatCurrency(quadratura.metodoPerFlussi)} (differenza {formatCurrency(quadratura.differenzaMetodi)})
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card">
          <span className="text-xs text-slate-400 uppercase">Liquidità</span>
          <div className="text-lg font-semibold text-slate-800">{formatCurrency(netWorth.liquidita)}</div>
        </div>
        <div className="card">
          <span className="text-xs text-slate-400 uppercase">Investimenti</span>
          <div className="text-lg font-semibold text-slate-800">{formatCurrency(netWorth.investimenti)}</div>
        </div>
        <div className="card">
          <span className="text-xs text-slate-400 uppercase">Patrimonio (beni)</span>
          <div className="text-lg font-semibold text-slate-800">{formatCurrency(netWorth.patrimonioImmobiliare)}</div>
        </div>
        <div className="card">
          <span className="text-xs text-slate-400 uppercase">Debiti</span>
          <div className="text-lg font-semibold text-red-600">{formatCurrency(netWorth.debiti)}</div>
        </div>
      </div>

      <div className="card bg-indigo-50 border-indigo-200 flex items-center justify-between">
        <span className="font-medium text-indigo-700">Patrimonio Netto Totale</span>
        <span className="text-2xl font-bold text-indigo-700">{formatCurrency(netWorth.patrimonioNetto)}</span>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card">
          <h2 className="font-semibold text-slate-700 mb-2">Attività ({formatCurrency(totaleAttivita)})</h2>
          <table className="table-base">
            <tbody>
              {attivi.map((a) => (
                <tr key={a.id}>
                  <td>{a.name}</td>
                  <td className="text-slate-400 text-xs">{ACCOUNT_TYPE_LABELS[a.type]}</td>
                  <td className="text-right font-medium">{formatCurrency(balances[a.id] ?? 0)}</td>
                </tr>
              ))}
              {holdings
                .filter((h) => h.quantity > 0)
                .map((h) => (
                  <tr key={h.investment.id}>
                    <td>{h.investment.name}</td>
                    <td className="text-slate-400 text-xs">Investimento</td>
                    <td className="text-right font-medium">{formatCurrency(h.currentValue)}</td>
                  </tr>
                ))}
              {patrimonioAssets.map((a) => (
                <tr key={a.id}>
                  <td>{a.name}</td>
                  <td className="text-slate-400 text-xs">{ASSET_CATEGORY_LABELS[a.category]}</td>
                  <td className="text-right font-medium">{formatCurrency(a.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card">
          <h2 className="font-semibold text-slate-700 mb-2">Passività ({formatCurrency(totalePassivita)})</h2>
          {passivi.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">Nessuna passività / debito registrato.</p>
          ) : (
            <table className="table-base">
              <tbody>
                {passivi.map((a) => (
                  <tr key={a.id}>
                    <td>{a.name}</td>
                    <td className="text-slate-400 text-xs">{ACCOUNT_TYPE_LABELS[a.type]}</td>
                    <td className="text-right font-medium text-red-600">{formatCurrency(Math.abs(balances[a.id] ?? 0))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between text-sm font-semibold">
            <span>Patrimonio Netto (Attività − Passività)</span>
            <span>{formatCurrency(totaleAttivita - totalePassivita)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
