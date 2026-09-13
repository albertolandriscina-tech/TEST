import type { Category } from '../types';
import { newId } from '../utils/id';
import { CATEGORY_COLOR_PALETTE } from '../utils/categoryStyle';

/** Categorie di default proposte al primo avvio, con alcune sottocategorie di esempio. */
export function buildDefaultCategories(): Category[] {
  const cats: Category[] = [];

  const income = (name: string, icon: string, color: string) => {
    const c: Category = { id: newId(), name, kind: 'income', parentId: null, icon, color };
    cats.push(c);
    return c;
  };
  const expense = (name: string, icon: string, color: string) => {
    const c: Category = { id: newId(), name, kind: 'expense', parentId: null, icon, color };
    cats.push(c);
    return c;
  };
  const sub = (parent: Category, name: string, icon: string, color?: string) => {
    const c: Category = { id: newId(), name, kind: parent.kind, parentId: parent.id, icon, color: color ?? parent.color };
    cats.push(c);
    return c;
  };

  income('Stipendio', 'wallet', CATEGORY_COLOR_PALETTE[13]);
  income('Altri redditi', 'gift', CATEGORY_COLOR_PALETTE[9]);

  const casa = expense('Casa', 'home', CATEGORY_COLOR_PALETTE[4]);
  sub(casa, 'Affitto/Mutuo', 'landmark');
  sub(casa, 'Bollette', 'zap');
  sub(casa, 'Manutenzione', 'wrench');

  const alimentari = expense('Alimentari', 'cart', CATEGORY_COLOR_PALETTE[1]);
  sub(alimentari, 'Supermercato', 'basket');
  sub(alimentari, 'Ristoranti', 'utensils');

  const trasporti = expense('Trasporti', 'car', CATEGORY_COLOR_PALETTE[8]);
  sub(trasporti, 'Carburante', 'fuel');
  sub(trasporti, 'Mezzi pubblici', 'bus');

  expense('Salute', 'stethoscope', CATEGORY_COLOR_PALETTE[5]);
  expense('Svago', 'gamepad', CATEGORY_COLOR_PALETTE[2]);
  expense('Altro', 'package', CATEGORY_COLOR_PALETTE[15]);

  return cats;
}

export const SYSTEM_CATEGORY_INVESTMENT_BUY = 'Acquisti investimenti';
export const SYSTEM_CATEGORY_INVESTMENT_SELL = 'Vendite investimenti';
