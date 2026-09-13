import { useEffect, useState } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { Menu, Wallet } from 'lucide-react';
import { Sidebar } from './components/Layout/Sidebar';
import { Dashboard } from './components/Dashboard/Dashboard';
import { AccountsPage } from './components/Accounts/AccountsPage';
import { TransactionsPage } from './components/Transactions/TransactionsPage';
import { AnalysisPage } from './components/Analysis/AnalysisPage';
import { CategoriesPage } from './components/Categories/CategoriesPage';
import { BudgetsPage } from './components/Budgets/BudgetsPage';
import { InvestmentsPage } from './components/Investments/InvestmentsPage';
import { AssetsPage } from './components/Assets/AssetsPage';
import { BalanceSheetPage } from './components/BalanceSheet/BalanceSheetPage';
import { RecurringPage } from './components/Recurring/RecurringPage';
import { useStore } from './store/useStore';

export default function App() {
  const generateDueRecurring = useStore((s) => s.generateDueRecurring);
  const [notice, setNotice] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const count = generateDueRecurring();
    if (count > 0) {
      setNotice(`Generati ${count} movimenti ricorrenti dovuti.`);
      const t = setTimeout(() => setNotice(null), 5000);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center gap-3 px-4 h-14 border-b border-slate-200 bg-white shrink-0 lg:hidden">
          <button className="btn-ghost !p-2" onClick={() => setSidebarOpen(true)} aria-label="Apri menu">
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-md bg-indigo-600 flex items-center justify-center text-white shrink-0">
              <Wallet size={13} />
            </div>
            <span className="font-semibold text-slate-800 text-sm truncate">Finanza Personale</span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          {notice && (
            <div className="bg-indigo-600 text-white text-sm text-center py-1.5 px-3">{notice}</div>
          )}
          <div className="max-w-7xl mx-auto p-4 sm:p-6">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/movimenti" element={<TransactionsPage />} />
              <Route path="/analisi" element={<AnalysisPage />} />
              <Route path="/conti" element={<AccountsPage />} />
              <Route path="/categorie" element={<CategoriesPage />} />
              <Route path="/budget" element={<BudgetsPage />} />
              <Route path="/investimenti" element={<InvestmentsPage />} />
              <Route path="/patrimonio" element={<AssetsPage />} />
              <Route path="/bilancio" element={<BalanceSheetPage />} />
              <Route path="/ricorrenti" element={<RecurringPage />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}
