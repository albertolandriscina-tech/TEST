import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  ComposedChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Wallet, TrendingUp, TrendingDown, Scale } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { computeAllHoldings, computeNetWorth, getCategoryPath } from '../../utils/ledger';
import { formatCurrency, MONTH_NAMES_SHORT_IT } from '../../utils/format';
import { StatCard } from '../common/StatCard';

const PALETTE = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6', '#14b8a6'];

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function Dashboard() {
  const accounts = useStore((s) => s.accounts);
  const transactions = useStore((s) => s.transactions);
  const categories = useStore((s) => s.categories);
  const investments = useStore((s) => s.investments);
  const investmentTransactions = useStore((s) => s.investmentTransactions);
  const patrimonioAssets = useStore((s) => s.patrimonioAssets);

  const [monthsWindow] = useState(12);

  const now = new Date();
  const currentMonthKey = monthKey(now);

  const currentMonthIncome = transactions
    .filter((t) => t.type === 'income' && t.date.startsWith(currentMonthKey))
    .reduce((s, t) => s + t.amount, 0);
  const currentMonthExpense = transactions
    .filter((t) => t.type === 'expense' && t.date.startsWith(currentMonthKey))
    .reduce((s, t) => s + t.amount, 0);

  const holdings = useMemo(() => computeAllHoldings(investments, investmentTransactions), [investments, investmentTransactions]);
  const netWorth = useMemo(
    () => computeNetWorth(accounts, transactions, holdings, patrimonioAssets),
    [accounts, transactions, holdings, patrimonioAssets]
  );

  const trendData = useMemo(() => {
    const months: { key: string; label: string; entrate: number; uscite: number; saldo: number }[] = [];
    for (let i = monthsWindow - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = monthKey(d);
      const entrate = transactions.filter((t) => t.type === 'income' && t.date.startsWith(key)).reduce((s, t) => s + t.amount, 0);
      const uscite = transactions.filter((t) => t.type === 'expense' && t.date.startsWith(key)).reduce((s, t) => s + t.amount, 0);
      months.push({
        key,
        label: `${MONTH_NAMES_SHORT_IT[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`,
        entrate,
        uscite,
        saldo: entrate - uscite,
      });
    }
    return months;
  }, [transactions, monthsWindow]);

  const categoryBreakdown = useMemo(() => {
    const roots = categories.filter((c) => c.kind === 'expense' && !c.parentId);
    const data = roots
      .map((root) => {
        const value = transactions
          .filter((t) => t.type === 'expense' && t.date.startsWith(currentMonthKey))
          .filter((t) => {
            if (t.categoryId === root.id) return true;
            const cat = categories.find((c) => c.id === t.categoryId);
            return cat?.parentId === root.id;
          })
          .reduce((s, t) => s + t.amount, 0);
        return { name: root.name, value };
      })
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);
    return data;
  }, [transactions, categories, currentMonthKey]);

  const recentTransactions = useMemo(
    () => [...transactions].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)).slice(0, 8),
    [transactions]
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Dashboard</h1>
        <p className="text-sm text-slate-500">Andamento mensile di entrate, uscite e patrimonio complessivo.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Entrate (mese)" value={formatCurrency(currentMonthIncome)} tone="positive" icon={<TrendingUp size={16} className="text-emerald-500" />} />
        <StatCard label="Uscite (mese)" value={formatCurrency(currentMonthExpense)} tone="negative" icon={<TrendingDown size={16} className="text-red-500" />} />
        <StatCard
          label="Saldo (mese)"
          value={formatCurrency(currentMonthIncome - currentMonthExpense)}
          tone={currentMonthIncome - currentMonthExpense >= 0 ? 'positive' : 'negative'}
          icon={<Scale size={16} className="text-indigo-500" />}
        />
        <StatCard label="Patrimonio netto" value={formatCurrency(netWorth.patrimonioNetto)} tone="accent" icon={<Wallet size={16} className="text-indigo-500" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card lg:col-span-2">
          <h2 className="font-semibold text-slate-700 mb-3">Andamento ultimi {monthsWindow} mesi</h2>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCurrency(v)} width={80} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Legend />
              <Bar dataKey="entrate" name="Entrate" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="uscite" name="Uscite" fill="#ef4444" radius={[4, 4, 0, 0]} />
              <Line type="monotone" dataKey="saldo" name="Saldo netto" stroke="#6366f1" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h2 className="font-semibold text-slate-700 mb-3">Spese per categoria (mese)</h2>
          {categoryBreakdown.length === 0 ? (
            <p className="text-sm text-slate-400 py-10 text-center">Nessuna spesa registrata questo mese.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={categoryBreakdown} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                  {categoryBreakdown.map((_, i) => (
                    <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card lg:col-span-2 !p-0 overflow-x-auto">
          <div className="px-4 pt-4">
            <h2 className="font-semibold text-slate-700 mb-2">Ultimi movimenti</h2>
          </div>
          <table className="table-base">
            <thead>
              <tr>
                <th>Data</th>
                <th>Descrizione</th>
                <th>Categoria</th>
                <th className="text-right">Importo</th>
              </tr>
            </thead>
            <tbody>
              {recentTransactions.map((t) => (
                <tr key={t.id}>
                  <td>{t.date}</td>
                  <td>{t.description}</td>
                  <td className="text-slate-500">{t.type === 'transfer' ? 'Giroconto' : getCategoryPath(t.categoryId, categories)}</td>
                  <td
                    className={`text-right font-medium ${
                      t.type === 'income' ? 'text-emerald-600' : t.type === 'expense' ? 'text-red-600' : 'text-blue-600'
                    }`}
                  >
                    {t.type === 'income' ? '+' : t.type === 'expense' ? '-' : ''}
                    {formatCurrency(t.amount)}
                  </td>
                </tr>
              ))}
              {recentTransactions.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center text-slate-400 py-6">
                    Nessun movimento registrato. Vai su "Movimenti" per aggiungerne uno.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h2 className="font-semibold text-slate-700 mb-3">Composizione patrimonio</h2>
          <ul className="space-y-2 text-sm">
            <li className="flex justify-between">
              <span className="text-slate-500">Liquidità</span>
              <span className="font-medium">{formatCurrency(netWorth.liquidita)}</span>
            </li>
            <li className="flex justify-between">
              <span className="text-slate-500">Investimenti</span>
              <span className="font-medium">{formatCurrency(netWorth.investimenti)}</span>
            </li>
            <li className="flex justify-between">
              <span className="text-slate-500">Beni patrimoniali</span>
              <span className="font-medium">{formatCurrency(netWorth.patrimonioImmobiliare)}</span>
            </li>
            <li className="flex justify-between">
              <span className="text-slate-500">Debiti</span>
              <span className="font-medium text-red-600">-{formatCurrency(netWorth.debiti)}</span>
            </li>
            <li className="flex justify-between pt-2 border-t border-slate-100 font-semibold">
              <span>Patrimonio netto</span>
              <span>{formatCurrency(netWorth.patrimonioNetto)}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
