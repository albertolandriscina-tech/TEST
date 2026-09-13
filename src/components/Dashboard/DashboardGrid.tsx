import { WidthProvider, Responsive, type Layout } from 'react-grid-layout';
import type { ReactNode } from 'react';
import type { DashboardWidgetLayout } from '../../types';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

const BREAKPOINTS = { lg: 1100, md: 800, sm: 600, xs: 0 };
const COLS = { lg: 12, md: 8, sm: 4, xs: 2 };

interface DashboardGridProps {
  layout: DashboardWidgetLayout[];
  editMode: boolean;
  onLayoutChange: (layout: DashboardWidgetLayout[]) => void;
  renderWidget: (id: string) => ReactNode;
}

export function DashboardGrid({ layout, editMode, onLayoutChange, renderWidget }: DashboardGridProps) {
  return (
    <ResponsiveGridLayout
      className="layout -m-2"
      layouts={{ lg: layout as Layout[] }}
      breakpoints={BREAKPOINTS}
      cols={COLS}
      rowHeight={28}
      margin={[8, 8]}
      isDraggable={editMode}
      isResizable={editMode}
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
