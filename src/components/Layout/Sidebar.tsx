import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Landmark,
  ArrowLeftRight,
  Tags,
  PiggyBank,
  TrendingUp,
  Building2,
  Scale,
  Repeat,
  Wallet,
  Sparkles,
  Eraser,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { ConfirmDialog } from '../common/ConfirmDialog';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/movimenti', label: 'Movimenti', icon: ArrowLeftRight },
  { to: '/conti', label: 'Conti', icon: Landmark },
  { to: '/categorie', label: 'Categorie', icon: Tags },
  { to: '/budget', label: 'Budget', icon: PiggyBank },
  { to: '/investimenti', label: 'Investimenti', icon: TrendingUp },
  { to: '/patrimonio', label: 'Patrimonio', icon: Building2 },
  { to: '/bilancio', label: 'Bilancio', icon: Scale },
  { to: '/ricorrenti', label: 'Ricorrenti', icon: Repeat },
];

export function Sidebar() {
  const loadDemoData = useStore((s) => s.loadDemoData);
  const resetAllData = useStore((s) => s.resetAllData);
  const [confirmDemo, setConfirmDemo] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <aside className="w-60 shrink-0 bg-white border-r border-slate-200 flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-4 border-b border-slate-200">
        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
          <Wallet size={18} />
        </div>
        <span className="font-semibold text-slate-800">Finanza Personale</span>
      </div>
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'
              }`
            }
          >
            <Icon size={17} />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="px-2 py-2 border-t border-slate-200 space-y-0.5">
        <button
          className="flex w-full items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100"
          onClick={() => setConfirmDemo(true)}
        >
          <Sparkles size={16} className="text-indigo-500" />
          Carica dati di esempio
        </button>
        <button
          className="flex w-full items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100"
          onClick={() => setConfirmReset(true)}
        >
          <Eraser size={16} className="text-slate-400" />
          Svuota tutti i dati
        </button>
      </div>
      <div className="px-4 py-3 border-t border-slate-200 text-[11px] text-slate-400">
        Dati salvati solo in locale nel browser.
      </div>

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
    </aside>
  );
}
