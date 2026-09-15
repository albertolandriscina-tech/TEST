import { useState } from 'react';
import { LayoutGrid, Plus, RotateCcw, Check } from 'lucide-react';
import { useStore } from '../../store/useStore';
import type { DashboardWidgetType } from '../../types';
import { WIDGET_DEFINITIONS, DEFAULT_WIDGET_ORDER } from '../../dashboardWidgets';
import { defaultDashboardPeriod, type DashboardPeriod } from '../../utils/period';
import { DashboardPeriodContext } from './DashboardPeriodContext';
import { PeriodSelector } from './PeriodSelector';
import { DashboardGrid } from './DashboardGrid';
import { WidgetCard } from './WidgetCard';
import { KpiWidget } from './widgets/KpiWidget';
import { NetWorthBreakdownWidget } from './widgets/NetWorthBreakdownWidget';
import { CashFlowWidget } from './widgets/CashFlowWidget';
import { NetWorthTrendWidget } from './widgets/NetWorthTrendWidget';
import { BudgetWidget } from './widgets/BudgetWidget';
import { AccountsBalanceWidget } from './widgets/AccountsBalanceWidget';
import { CategoryBreakdownWidget } from './widgets/CategoryBreakdownWidget';
import { ExpenseNatureWidget } from './widgets/ExpenseNatureWidget';
import { RecentTransactionsWidget } from './widgets/RecentTransactionsWidget';
import { BalanceForecastWidget } from './widgets/BalanceForecastWidget';
import { CreditCardUsageWidget } from './widgets/CreditCardUsageWidget';

const WIDGET_CONTENT: Record<DashboardWidgetType, () => JSX.Element> = {
  kpi: KpiWidget,
  'networth-breakdown': NetWorthBreakdownWidget,
  cashflow: CashFlowWidget,
  'networth-trend': NetWorthTrendWidget,
  budget: BudgetWidget,
  'accounts-balance': AccountsBalanceWidget,
  'category-breakdown': CategoryBreakdownWidget,
  'expense-nature': ExpenseNatureWidget,
  'recent-transactions': RecentTransactionsWidget,
  'balance-forecast': BalanceForecastWidget,
  'credit-usage': CreditCardUsageWidget,
};

export function Dashboard() {
  const layout = useStore((s) => s.dashboardLayout);
  const hidden = useStore((s) => s.hiddenDashboardWidgets);
  const setDashboardLayout = useStore((s) => s.setDashboardLayout);
  const hideDashboardWidget = useStore((s) => s.hideDashboardWidget);
  const showDashboardWidget = useStore((s) => s.showDashboardWidget);
  const resetDashboardLayout = useStore((s) => s.resetDashboardLayout);

  const [editMode, setEditMode] = useState(false);
  const [isStackedLayout, setIsStackedLayout] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [period, setPeriod] = useState<DashboardPeriod>(defaultDashboardPeriod);

  const visibleLayout = layout.filter((l) => !hidden.includes(l.i as DashboardWidgetType));
  const hiddenTypes = DEFAULT_WIDGET_ORDER.filter((t) => hidden.includes(t) || !layout.some((l) => l.i === t));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-800">Dashboard</h1>
          <p className="text-sm text-slate-500">Andamento di entrate, uscite e patrimonio nel periodo selezionato.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {editMode && (
            <div className="relative">
              <button className="btn-secondary" onClick={() => setShowAddMenu((v) => !v)} disabled={hiddenTypes.length === 0}>
                <Plus size={15} /> Aggiungi widget
              </button>
              {showAddMenu && (
                <div className="absolute right-0 mt-1 w-56 bg-white border border-slate-200 rounded-lg shadow-lg z-10 py-1">
                  {hiddenTypes.length === 0 ? (
                    <p className="px-3 py-2 text-xs text-slate-400">Tutti i widget sono già visibili.</p>
                  ) : (
                    hiddenTypes.map((type) => (
                      <button
                        key={type}
                        className="w-full text-left px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                        onClick={() => {
                          showDashboardWidget(type);
                          setShowAddMenu(false);
                        }}
                      >
                        {WIDGET_DEFINITIONS[type].title}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
          {editMode && (
            <button className="btn-secondary" onClick={resetDashboardLayout}>
              <RotateCcw size={15} /> Ripristina layout
            </button>
          )}
          <button className={editMode ? 'btn-primary' : 'btn-secondary'} onClick={() => setEditMode((v) => !v)}>
            {editMode ? <Check size={15} /> : <LayoutGrid size={15} />}
            {editMode ? 'Fatto' : 'Personalizza'}
          </button>
        </div>
      </div>

      <PeriodSelector period={period} onChange={setPeriod} />

      {editMode && (
        <div className="card !py-2 bg-primary-50 border-primary-200 text-sm text-primary-700">
          Trascina i widget dall'icona <span className="inline-block align-middle">⠿</span> per riordinarli
          {/* Sotto i 768px di contenitore (non di finestra: la sidebar è fissa e non
              conta) i widget occupano sempre tutta la larghezza e il ridimensionamento
              manuale è disattivato in DashboardGrid: l'istruzione non deve quindi
              comparire, per non promettere un'azione impossibile. */}
          {!isStackedLayout && ", ridimensionali dall'angolo in basso a destra,"} o rimuovili con la ×.
        </div>
      )}

      <DashboardPeriodContext.Provider value={period}>
        <DashboardGrid
          layout={visibleLayout}
          editMode={editMode}
          onLayoutChange={setDashboardLayout}
          onStackedChange={setIsStackedLayout}
          renderWidget={(id) => {
            const type = id as DashboardWidgetType;
            const Content = WIDGET_CONTENT[type];
            return (
              <WidgetCard title={WIDGET_DEFINITIONS[type].title} editMode={editMode} onRemove={() => hideDashboardWidget(type)}>
                <Content />
              </WidgetCard>
            );
          }}
        />
      </DashboardPeriodContext.Provider>
    </div>
  );
}
