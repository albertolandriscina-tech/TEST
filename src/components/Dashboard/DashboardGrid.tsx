import { useEffect, useState } from 'react';
import { WidthProvider, Responsive, type Layout } from 'react-grid-layout';
import type { ReactNode } from 'react';
import type { DashboardWidgetLayout, DashboardWidgetType } from '../../types';
import { WIDGET_DEFINITIONS } from '../../dashboardWidgets';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

const BREAKPOINTS = { lg: 1024, md: 768, sm: 480, xs: 0 };
const COLS = { lg: 12, md: 6, sm: 4, xs: 2 };

// Sotto i 768px (breakpoint "sm"/"xs") i widget sono sempre impilati a piena
// larghezza (vedi buildStackedLayout): solo l'altezza ha senso da ridimensionare.
const STACKED_BREAKPOINTS = new Set(['sm', 'xs']);

function getInitialBreakpoint(): string {
  if (typeof window === 'undefined') return 'lg';
  const w = window.innerWidth;
  if (w >= BREAKPOINTS.lg) return 'lg';
  if (w >= BREAKPOINTS.md) return 'md';
  if (w >= BREAKPOINTS.sm) return 'sm';
  return 'xs';
}

/**
 * Sotto i 768px (telefono, e tablet stretto) i widget vengono impilati a piena larghezza
 * in un'unica colonna, nell'ordine visivo con cui appaiono da desktop (per riga, poi per
 * colonna): la disposizione automatica di react-grid-layout per i breakpoint senza un
 * layout esplicito scala solo la larghezza in base al numero di colonne, non l'altezza,
 * e taglierebbe il contenuto dei widget la cui griglia interna passa da una riga a due
 * schede quando lo spazio orizzontale si restringe (vedi mobileExtraRows).
 */
function buildStackedLayout(layout: DashboardWidgetLayout[], cols: number): Layout[] {
  const sorted = [...layout].sort((a, b) => a.y - b.y || a.x - b.x);
  let y = 0;
  return sorted.map((l) => {
    const extraRows = WIDGET_DEFINITIONS[l.i as DashboardWidgetType]?.mobileExtraRows ?? 0;
    const h = l.h + extraRows;
    const item: Layout = { i: l.i, x: 0, y, w: cols, h, minW: l.minW, minH: l.minH };
    y += h;
    return item;
  });
}

interface DashboardGridProps {
  layout: DashboardWidgetLayout[];
  editMode: boolean;
  onLayoutChange: (layout: DashboardWidgetLayout[]) => void;
  renderWidget: (id: string) => ReactNode;
  /** Notifica il genitore quando la griglia passa alla modalità impilata a piena
   * larghezza (sotto i 768px di CONTENITORE, non di finestra: con la sidebar fissa
   * i due valori possono differire), così testi/istruzioni esterni alla griglia
   * possono restare coerenti con ciò che è davvero possibile fare qui. */
  onStackedChange?: (isStacked: boolean) => void;
}

export function DashboardGrid({ layout, editMode, onLayoutChange, renderWidget, onStackedChange }: DashboardGridProps) {
  const [breakpoint, setBreakpoint] = useState(getInitialBreakpoint);
  const isStacked = STACKED_BREAKPOINTS.has(breakpoint);

  useEffect(() => {
    onStackedChange?.(isStacked);
  }, [isStacked, onStackedChange]);

  return (
    <ResponsiveGridLayout
      className="layout"
      layouts={{
        lg: layout as Layout[],
        sm: buildStackedLayout(layout, COLS.sm),
        xs: buildStackedLayout(layout, COLS.xs),
      }}
      breakpoints={BREAKPOINTS}
      cols={COLS}
      rowHeight={28}
      margin={[8, 8]}
      isDraggable={editMode}
      // Sotto i 768px i widget sono sempre impilati a piena larghezza (vedi
      // buildStackedLayout) e l'altezza segue già il contenuto (mobileExtraRows):
      // il ridimensionamento manuale qui non serve ed è disattivato, perché la
      // maniglia di resize di react-grid-layout calcola le nuove dimensioni in
      // base ai riferimenti del breakpoint "lg" e faceva apparire il widget
      // grande come su desktop (finché non si ricaricava la pagina). Restano
      // sempre possibili il trascinamento (per riordinare) e il ridimensionamento
      // da tablet largo in su.
      isResizable={editMode && !isStacked}
      onBreakpointChange={(newBreakpoint) => setBreakpoint(newBreakpoint)}
      draggableHandle=".widget-drag-handle"
      onLayoutChange={(current, all) => {
        if (!editMode) return;
        const source = all.lg && all.lg.length === layout.length ? all.lg : current;
        onLayoutChange(source.map((l) => ({ i: l.i, x: l.x, y: l.y, w: l.w, h: l.h, minW: l.minW, minH: l.minH })));
      }}
    >
      {layout.map((item) => (
        <div key={item.i}>{renderWidget(item.i)}</div>
      ))}
    </ResponsiveGridLayout>
  );
}
