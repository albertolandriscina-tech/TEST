import { useEffect, useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Sidebar } from './components/Layout/Sidebar';
import { Dashboard } from './components/Dashboard/Dashboard';
import { AccountsPage } from './components/Accounts/AccountsPage';
import { TransactionsPage } from './components/Transactions/TransactionsPage';
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

  useEffect(() => {
    const count = generateDueRecurring();
    if (count > 0) {
      setNotice(`Generati ${count} movimenti ricorrenti dovuti.`);
      const t = setTimeout(() => setNotice(null), 5000);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {notice && (
          <div className="bg-indigo-600 text-white text-sm text-center py-1.5">{notice}</div>
        )}
        <div className="max-w-7xl mx-auto p-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/movimenti" element={<TransactionsPage />} />
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
  );
}
