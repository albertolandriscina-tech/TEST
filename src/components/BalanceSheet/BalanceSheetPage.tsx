import { useMemo, useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { ACCOUNT_TYPE_LABELS, ASSET_CATEGORY_LABELS } from '../../types';
import { computeAllAccountBalances, computeAllHoldings, computeIncomeStatement, computeNetWorth, computeQuadratura } from '../../utils/ledger';
import { formatCurrency } from '../../utils/format';
import { CategoryIconCircle } from '../common/CategoryBadge';

function useYears() {
  const transactions = useStore((s) => s.transactions);
  return useMemo(() => {
    const years = new Set<number>();
    years.add(new Date().getFullYear());
    transactions.forEach((t) => years.add(Number(t.date.slice(0, 4))));
    return Array.from(years).sort((a, b) => b - a);
  }, [transactions]);
}

export function BalanceSheetPage() {
  const accounts = useStore((s) => s.accounts);
  const transactions = useStore((s) => s.transactions);
  const categories = useStore((s) => s.categories);
  const investments = useStore((s) => s.investments);
  const investmentTransactions = useStore((s) => s.investmentTransactions);
  const patrimonioAssets = useStore((s) => s.patrimonioAssets);

  const years = useYears();
  const [year, setYear] = useState(years[0] ?? new Date().getFullYear());

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
  const incomeStatement = useMemo(
    () => computeIncomeStatement(transactions, categories, year),
    [transactions, categories, year]
  );

  const attivi = accounts.filter((a) => (balances[a.id] ?? 0) >= 0);
  const passivi = accounts.filter((a) => (balances[a.id] ?? 0) < 0);

  const totaleAttivita = netWorth.liquidita + netWorth.investimenti + netWorth.patrimonioImmobiliare;
  const totalePassivita = netWorth.debiti;

  const { costi, ricavi, totaleCosti, totaleRicavi, risultato } = incomeStatement;
  const utile = risultato > 0 ? risultato : 0;
  const perdita = risultato < 0 ? -risultato : 0;
  const pareggio = Math.max(totaleCosti + utile, totaleRicavi + perdita);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Bilancio e quadratura</h1>
        <p className="text-sm text-slate-500">
          Conto economico e stato patrimoniale, con controllo di quadratura della partita doppia.
        </p>
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

      {/* ---------------- Conto Economico ---------------- */}
      <div className="flex items-center justify-between flex-wrap gap-2 pt-2">
        <h2 className="text-lg font-semibold text-slate-800">Conto Economico</h2>
        <div>
          <label className="label !mb-0 mr-2 inline">Esercizio</label>
          <select className="input !inline-block !w-auto" value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div
        className={`card flex items-center gap-3 flex-wrap ${risultato >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}
      >
        <div className="flex-1 min-w-[200px]">
          <div className={`font-semibold ${risultato >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
            {risultato >= 0 ? `Utile d'esercizio ${year}` : `Perdita d'esercizio ${year}`}
          </div>
          <div className="text-sm text-slate-500">
            Ricavi {formatCurrency(totaleRicavi)} − Costi {formatCurrency(totaleCosti)}
          </div>
        </div>
        <span className={`text-2xl font-bold ${risultato >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
          {formatCurrency(risultato)}
        </span>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card !p-0 overflow-hidden">
          <h3 className="font-semibold text-slate-700 px-4 pt-4 pb-2">Costi (Dare)</h3>
          <div className="overflow-x-auto">
            <table className="table-base">
              <tbody>
                {costi.map(({ category, amount }) => (
                  <tr key={category.id}>
                    <td>
                      <span className="flex items-center gap-2">
                        <CategoryIconCircle category={category} />
                        {category.name}
                      </span>
                    </td>
                    <td className="text-right font-medium">{formatCurrency(amount)}</td>
                  </tr>
                ))}
                {costi.length === 0 && (
                  <tr>
                    <td colSpan={2} className="text-center text-slate-400 py-4">
                      Nessun costo registrato nell'esercizio.
                    </td>
                  </tr>
                )}
                {utile > 0 && (
                  <tr className="bg-emerald-50/60">
                    <td className="font-medium text-emerald-700">Utile d'esercizio (a pareggio)</td>
                    <td className="text-right font-semibold text-emerald-700">{formatCurrency(utile)}</td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200">
                  <td className="font-semibold text-slate-700">Totale a pareggio</td>
                  <td className="text-right font-bold text-slate-800">{formatCurrency(pareggio)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div className="card !p-0 overflow-hidden">
          <h3 className="font-semibold text-slate-700 px-4 pt-4 pb-2">Ricavi (Avere)</h3>
          <div className="overflow-x-auto">
            <table className="table-base">
              <tbody>
                {ricavi.map(({ category, amount }) => (
                  <tr key={category.id}>
                    <td>
                      <span className="flex items-center gap-2">
                        <CategoryIconCircle category={category} />
                        {category.name}
                      </span>
                    </td>
                    <td className="text-right font-medium">{formatCurrency(amount)}</td>
                  </tr>
                ))}
                {ricavi.length === 0 && (
                  <tr>
                    <td colSpan={2} className="text-center text-slate-400 py-4">
                      Nessun ricavo registrato nell'esercizio.
                    </td>
                  </tr>
                )}
                {perdita > 0 && (
                  <tr className="bg-red-50/60">
                    <td className="font-medium text-red-700">Perdita d'esercizio (a pareggio)</td>
                    <td className="text-right font-semibold text-red-700">{formatCurrency(perdita)}</td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200">
                  <td className="font-semibold text-slate-700">Totale a pareggio</td>
                  <td className="text-right font-bold text-slate-800">{formatCurrency(pareggio)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      <p className="text-xs text-slate-400">
        Il Conto Economico riepiloga costi e ricavi dell'esercizio secondo la logica delle sezioni contrapposte
        Dare/Avere della partita doppia (esclusi gli acquisti e le vendite di investimenti, che sono trasferimenti
        patrimoniali e non componenti di reddito). Il risultato dell'esercizio confluisce nel Patrimonio Netto dello
        Stato Patrimoniale.
      </p>

      {/* ---------------- Stato Patrimoniale ---------------- */}
      <h2 className="text-lg font-semibold text-slate-800 pt-2">Stato Patrimoniale</h2>

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

      <div className="card bg-primary-50 border-primary-200 flex items-center justify-between flex-wrap gap-2">
        <span className="font-medium text-primary-700">Patrimonio Netto Totale</span>
        <span className="text-2xl font-bold text-primary-700">{formatCurrency(netWorth.patrimonioNetto)}</span>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="font-semibold text-slate-700 mb-2">Attività ({formatCurrency(totaleAttivita)})</h3>
          <div className="overflow-x-auto">
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
        </div>
        <div className="card">
          <h3 className="font-semibold text-slate-700 mb-2">Passività ({formatCurrency(totalePassivita)})</h3>
          {passivi.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">Nessuna passività / debito registrato.</p>
          ) : (
            <div className="overflow-x-auto">
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
            </div>
          )}
          <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between text-sm font-semibold flex-wrap gap-2">
            <span>Patrimonio Netto (Attività − Passività)</span>
            <span>{formatCurrency(totaleAttivita - totalePassivita)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
