import { lazy, Suspense, useEffect, useState } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { Menu, Wallet } from 'lucide-react';
import { Sidebar } from './components/Layout/Sidebar';
import { AuthPage } from './components/Auth/AuthPage';
import { InstallAppPrompt } from './components/common/InstallAppPrompt';
import { useStore } from './store/useStore';
import { useAuthStore } from './store/authStore';
import { useSyncStatus } from './store/syncStatus';
import { useCloudSync } from './hooks/useCloudSync';
import { isSupabaseConfigured } from './lib/supabaseClient';
import { applyAppearance } from './utils/theme';

// Ogni pagina è caricata solo quando l'utente la visita (bundle più leggero al primo
// avvio, soprattutto per chi apre solo la Dashboard e non usa mai le altre sezioni).
const Dashboard = lazy(() => import('./components/Dashboard/Dashboard').then((m) => ({ default: m.Dashboard })));
const AccountsPage = lazy(() => import('./components/Accounts/AccountsPage').then((m) => ({ default: m.AccountsPage })));
const AccountDetailPage = lazy(() =>
  import('./components/Accounts/AccountDetailPage').then((m) => ({ default: m.AccountDetailPage }))
);
const TransactionsPage = lazy(() =>
  import('./components/Transactions/TransactionsPage').then((m) => ({ default: m.TransactionsPage }))
);
const AnalysisPage = lazy(() => import('./components/Analysis/AnalysisPage').then((m) => ({ default: m.AnalysisPage })));
const CategoriesPage = lazy(() => import('./components/Categories/CategoriesPage').then((m) => ({ default: m.CategoriesPage })));
const RulesPage = lazy(() => import('./components/Rules/RulesPage').then((m) => ({ default: m.RulesPage })));
const BudgetsPage = lazy(() => import('./components/Budgets/BudgetsPage').then((m) => ({ default: m.BudgetsPage })));
const InvestmentsPage = lazy(() =>
  import('./components/Investments/InvestmentsPage').then((m) => ({ default: m.InvestmentsPage }))
);
const AssetsPage = lazy(() => import('./components/Assets/AssetsPage').then((m) => ({ default: m.AssetsPage })));
const BalanceSheetPage = lazy(() =>
  import('./components/BalanceSheet/BalanceSheetPage').then((m) => ({ default: m.BalanceSheetPage }))
);
const RecurringPage = lazy(() => import('./components/Recurring/RecurringPage').then((m) => ({ default: m.RecurringPage })));
const SettingsPage = lazy(() => import('./components/Settings/SettingsPage').then((m) => ({ default: m.SettingsPage })));

const PREVIEW_SKIP_AUTH = import.meta.env.VITE_PREVIEW_SKIP_AUTH === 'true';

function FullScreenLoader() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="flex items-center gap-2 text-slate-400 text-sm">
        <span className="w-4 h-4 rounded-full border-2 border-slate-300 border-t-primary-600 animate-spin" />
        Caricamento…
      </div>
    </div>
  );
}

function RouteLoader() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="flex items-center gap-2 text-slate-400 text-sm">
        <span className="w-4 h-4 rounded-full border-2 border-slate-300 border-t-primary-600 animate-spin" />
        Caricamento…
      </div>
    </div>
  );
}

export default function App() {
  const generateDueRecurring = useStore((s) => s.generateDueRecurring);
  const settings = useStore((s) => s.settings);
  const session = useAuthStore((s) => s.session);
  const authInitializing = useAuthStore((s) => s.initializing);
  const syncStatus = useSyncStatus((s) => s.status);
  const [notice, setNotice] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  useCloudSync();

  useEffect(() => {
    if (PREVIEW_SKIP_AUTH) {
      useStore.getState().loadDemoData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!PREVIEW_SKIP_AUTH && !session) return;
    const count = generateDueRecurring();
    if (count > 0) {
      setNotice(`Generati ${count} movimenti ricorrenti dovuti.`);
      const t = setTimeout(() => setNotice(null), 5000);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    applyAppearance(settings.theme, settings.colorTheme, settings.fontFamily);
    if (settings.theme !== 'system') return;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyAppearance(settings.theme, settings.colorTheme, settings.fontFamily);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [settings.theme, settings.colorTheme, settings.fontFamily]);

  if (!PREVIEW_SKIP_AUTH) {
    if (isSupabaseConfigured && authInitializing) {
      return <FullScreenLoader />;
    }
    if (!isSupabaseConfigured || !session) {
      return <AuthPage />;
    }
    if (syncStatus === 'loading') {
      return <FullScreenLoader />;
    }
  }

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <InstallAppPrompt />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center gap-3 px-4 h-14 border-b border-slate-200 bg-white shrink-0 lg:hidden">
          <button className="btn-ghost !p-2" onClick={() => setSidebarOpen(true)} aria-label="Apri menu">
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-md bg-primary-600 flex items-center justify-center text-white shrink-0">
              <Wallet size={13} />
            </div>
            <span className="font-semibold text-slate-800 text-sm truncate">Finanza Personale</span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          {notice && (
            <div className="bg-primary-600 text-white text-sm text-center py-1.5 px-3">{notice}</div>
          )}
          <div className="max-w-7xl mx-auto p-4 sm:p-6">
            <Suspense fallback={<RouteLoader />}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/movimenti" element={<TransactionsPage />} />
                <Route path="/analisi" element={<AnalysisPage />} />
                <Route path="/conti" element={<AccountsPage />} />
                <Route path="/conti/:id" element={<AccountDetailPage />} />
                <Route path="/categorie" element={<CategoriesPage />} />
                <Route path="/regole" element={<RulesPage />} />
                <Route path="/budget" element={<BudgetsPage />} />
                <Route path="/investimenti" element={<InvestmentsPage />} />
                <Route path="/patrimonio" element={<AssetsPage />} />
                <Route path="/bilancio" element={<BalanceSheetPage />} />
                <Route path="/ricorrenti" element={<RecurringPage />} />
                <Route path="/impostazioni" element={<SettingsPage />} />
              </Routes>
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}
