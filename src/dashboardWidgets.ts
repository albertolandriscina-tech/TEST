import type { DashboardWidgetLayout, DashboardWidgetType } from './types';

export interface WidgetDefinition {
  type: DashboardWidgetType;
  title: string;
  defaultLayout: Omit<DashboardWidgetLayout, 'i'>;
}

export const WIDGET_DEFINITIONS: Record<DashboardWidgetType, WidgetDefinition> = {
  kpi: {
    type: 'kpi',
    title: 'Riepilogo del mese',
    defaultLayout: { x: 0, y: 0, w: 12, h: 8, minW: 6, minH: 6 },
  },
  cashflow: {
    type: 'cashflow',
    title: 'Flusso di cassa',
    defaultLayout: { x: 0, y: 8, w: 8, h: 10, minW: 4, minH: 6 },
  },
  'accounts-balance': {
    type: 'accounts-balance',
    title: 'Saldo conti',
    defaultLayout: { x: 8, y: 8, w: 4, h: 10, minW: 3, minH: 5 },
  },
  'networth-trend': {
    type: 'networth-trend',
    title: 'Andamento patrimonio netto',
    defaultLayout: { x: 0, y: 18, w: 6, h: 9, minW: 4, minH: 5 },
  },
  budget: {
    type: 'budget',
    title: 'Budget del mese',
    defaultLayout: { x: 6, y: 18, w: 6, h: 9, minW: 4, minH: 5 },
  },
  'category-breakdown': {
    type: 'category-breakdown',
    title: 'Spese per categoria (mese)',
    defaultLayout: { x: 0, y: 27, w: 5, h: 9, minW: 3, minH: 5 },
  },
  'recent-transactions': {
    type: 'recent-transactions',
    title: 'Ultimi movimenti',
    defaultLayout: { x: 5, y: 27, w: 7, h: 9, minW: 4, minH: 5 },
  },
};

export const DEFAULT_WIDGET_ORDER: DashboardWidgetType[] = [
  'kpi',
  'cashflow',
  'accounts-balance',
  'networth-trend',
  'budget',
  'category-breakdown',
  'recent-transactions',
];

export function buildDefaultLayout(): DashboardWidgetLayout[] {
  return DEFAULT_WIDGET_ORDER.map((type) => ({ i: type, ...WIDGET_DEFINITIONS[type].defaultLayout }));
}
