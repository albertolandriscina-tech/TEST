import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Landmark,
  ArrowLeftRight,
  PieChart,
  Tags,
  PiggyBank,
  TrendingUp,
  Building2,
  Scale,
  Repeat,
  Settings,
  Wallet,
  Sparkles,
  Eraser,
  LogOut,
  X,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useAuthStore } from '../../store/authStore';
import { useSyncStatus } from '../../store/syncStatus';
import { ConfirmDialog } from '../common/ConfirmDialog';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/movimenti', label: 'Movimenti', icon: ArrowLeftRight },
  { to: '/analisi', label: 'Analisi', icon: PieChart },
  { to: '/conti', label: 'Conti', icon: Landmark },
  { to: '/categorie', label: 'Categorie', icon: Tags },
  { to: '/budget', label: 'Budget', icon: PiggyBank },
  { to: '/investimenti', label: 'Investimenti', icon: TrendingUp },
  { to: '/patrimonio', label: 'Patrimonio', icon: Building2 },
  { to: '/bilancio', label: 'Bilancio', icon: Scale },
  { to: '/ricorrenti', label: 'Ricorrenti', icon: Repeat },
  { to: '/impostazioni', label: 'Impostazioni', icon: Settings },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

const SYNC_LABELS: Record<string, string> = {
  idle: '',
  loading: 'Caricamento…',
  saving: 'Salvataggio…',
  saved: 'Dati sincronizzati',
  error: 'Errore di sincronizzazione',
};

export function Sidebar({ open, onClose }: SidebarProps) {
  const loadDemoData = useStore((s) => s.loadDemoData);
  const resetAllData = useStore((s) => s.resetAllData);
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const syncStatus = useSyncStatus((s) => s.status);
  const [confirmDemo, setConfirmDemo] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);

  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={onClose} aria-hidden="true" />}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 max-w-[85vw] flex-col bg-white border-r border-slate-200 transform transition-transform duration-200 ease-out lg:static lg:z-auto lg:w-60 lg:max-w-none lg:translate-x-0 lg:shrink-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between gap-2 px-4 py-4 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center text-white shrink-0">
              <Wallet size={18} />
            </div>
            <span className="font-extrabold tracking-tight text-slate-800 truncate">Finanza Personale</span>
          </div>
          <button className="btn-ghost !p-1.5 lg:hidden" onClick={onClose} aria-label="Chiudi menu">
            <X size={18} />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2.5 lg:py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-primary-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              <Icon size={17} className="shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="px-2 py-2 border-t border-slate-200 space-y-0.5 shrink-0">
          <button
            className="flex w-full items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100"
            onClick={() => setConfirmDemo(true)}
          >
            <Sparkles size={16} className="text-primary-500 shrink-0" />
            <span className="truncate">Carica dati di esempio</span>
          </button>
          <button
            className="flex w-full items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100"
            onClick={() => setConfirmReset(true)}
          >
            <Eraser size={16} className="text-slate-400 shrink-0" />
            <span className="truncate">Svuota tutti i dati</span>
          </button>
        </div>
        <div className="px-2 py-2 border-t border-slate-200 shrink-0">
          <div className="flex items-center gap-2 px-3 py-1.5">
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium text-slate-700 truncate">{user?.email ?? 'Account'}</div>
              {syncStatus !== 'idle' && (
                <div className={`text-[11px] ${syncStatus === 'error' ? 'text-red-500' : 'text-slate-400'}`}>
                  {SYNC_LABELS[syncStatus]}
                </div>
              )}
            </div>
            <button
              className="btn-ghost !p-1.5 shrink-0"
              title="Esci"
              onClick={() => setConfirmLogout(true)}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {confirmDemo && (
        <ConfirmDialog
          title="Carica dati di esempio"
          message="Verranno sostituiti tutti i dati attuali con un set di dati di esempio (conti, movimenti, budget, investimenti e patrimonio) per esplorare l'app. Continuare?"
          confirmLabel="Carica"
          onCancel={() => setConfirmDemo(false)}
          onConfirm={() => {
            loadDemoData();
            setConfirmDemo(false);
          }}
        />
      )}
      {confirmReset && (
        <ConfirmDialog
          title="Svuota tutti i dati"
          message="Verranno eliminati definitivamente tutti i conti, movimenti, budget, investimenti e beni patrimoniali. Continuare?"
          confirmLabel="Svuota"
          onCancel={() => setConfirmReset(false)}
          onConfirm={() => {
            resetAllData();
            setConfirmReset(false);
          }}
        />
      )}
      {confirmLogout && (
        <ConfirmDialog
          title="Esci dall'account"
          message="Verrai disconnesso da questo dispositivo. I tuoi dati restano salvati sul tuo account."
          confirmLabel="Esci"
          onCancel={() => setConfirmLogout(false)}
          onConfirm={() => {
            signOut();
            setConfirmLogout(false);
          }}
        />
      )}
    </>
  );
}
