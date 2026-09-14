import type { DashboardWidgetLayout, DashboardWidgetType } from './types';

export interface WidgetDefinition {
  type: DashboardWidgetType;
  title: string;
  defaultLayout: Omit<DashboardWidgetLayout, 'i'>;
  /**
   * Righe di altezza aggiuntive quando il widget viene impilato a piena larghezza su
   * schermi da telefono (vedi DashboardGrid): il contenuto di alcuni widget passa da
   * una riga di card a due quando lo spazio orizzontale si restringe, e senza questa
   * altezza extra verrebbe tagliato invece di andare a capo.
   */
  mobileExtraRows?: number;
}

export const WIDGET_DEFINITIONS: Record<DashboardWidgetType, WidgetDefinition> = {
  kpi: {
    type: 'kpi',
    title: 'Riepilogo del periodo',
    defaultLayout: { x: 0, y: 0, w: 12, h: 4, minW: 3, minH: 2 },
    mobileExtraRows: 3,
  },
  'networth-breakdown': {
    type: 'networth-breakdown',
    title: 'Composizione del patrimonio',
    defaultLayout: { x: 0, y: 4, w: 12, h: 4, minW: 3, minH: 2 },
    mobileExtraRows: 3,
  },
  cashflow: {
    type: 'cashflow',
    title: 'Flusso di cassa',
    defaultLayout: { x: 0, y: 8, w: 8, h: 14, minW: 6, minH: 9 },
  },
  'accounts-balance': {
    type: 'accounts-balance',
    title: 'Saldo conti',
    defaultLayout: { x: 8, y: 8, w: 4, h: 10, minW: 3, minH: 5 },
  },
  'networth-trend': {
    type: 'networth-trend',
    title: 'Andamento patrimonio netto',
    defaultLayout: { x: 0, y: 18, w: 6, h: 10, minW: 4, minH: 6 },
  },
  budget: {
    type: 'budget',
    title: 'Budget del mese',
    defaultLayout: { x: 6, y: 18, w: 6, h: 9, minW: 4, minH: 5 },
  },
  'category-breakdown': {
    type: 'category-breakdown',
    title: 'Spese per categoria',
    defaultLayout: { x: 0, y: 27, w: 6, h: 9, minW: 3, minH: 5 },
  },
  'recent-transactions': {
    type: 'recent-transactions',
    title: 'Ultimi movimenti',
    defaultLayout: { x: 6, y: 27, w: 6, h: 10, minW: 4, minH: 5 },
  },
  'expense-nature': {
    type: 'expense-nature',
    title: 'Spese per natura',
    defaultLayout: { x: 0, y: 36, w: 5, h: 9, minW: 3, minH: 5 },
  },
  'balance-forecast': {
    type: 'balance-forecast',
    title: 'Tendenza saldo complessivo',
    defaultLayout: { x: 0, y: 45, w: 12, h: 12, minW: 6, minH: 7 },
    mobileExtraRows: 3,
  },
};

export const DEFAULT_WIDGET_ORDER: DashboardWidgetType[] = [
  'kpi',
  'networth-breakdown',
  'cashflow',
  'accounts-balance',
  'networth-trend',
  'budget',
  'category-breakdown',
  'recent-transactions',
  'expense-nature',
  'balance-forecast',
];

export function buildDefaultLayout(): DashboardWidgetLayout[] {
  return DEFAULT_WIDGET_ORDER.map((type) => ({ i: type, ...WIDGET_DEFINITIONS[type].defaultLayout }));
}
