import type { Category, ExpenseNature } from '../types';
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
  const expense = (name: string, icon: string, color: string, nature?: ExpenseNature) => {
    const c: Category = { id: newId(), name, kind: 'expense', parentId: null, icon, color, nature };
    cats.push(c);
    return c;
  };
  const sub = (parent: Category, name: string, icon: string, nature?: ExpenseNature, color?: string) => {
    const c: Category = { id: newId(), name, kind: parent.kind, parentId: parent.id, icon, color: color ?? parent.color, nature };
    cats.push(c);
    return c;
  };

  income('Stipendio', 'wallet', CATEGORY_COLOR_PALETTE[13]);
  income('Altri redditi', 'gift', CATEGORY_COLOR_PALETTE[9]);

  const casa = expense('Casa', 'home', CATEGORY_COLOR_PALETTE[4]);
  sub(casa, 'Affitto/Mutuo', 'landmark', 'obbligatoria');
  sub(casa, 'Bollette', 'zap', 'obbligatoria');
  sub(casa, 'Manutenzione', 'wrench', 'necessaria');

  const alimentari = expense('Alimentari', 'cart', CATEGORY_COLOR_PALETTE[1]);
  sub(alimentari, 'Supermercato', 'basket', 'necessaria');
  sub(alimentari, 'Ristoranti', 'utensils', 'extra');

  const trasporti = expense('Trasporti', 'car', CATEGORY_COLOR_PALETTE[8]);
  sub(trasporti, 'Carburante', 'fuel', 'necessaria');
  sub(trasporti, 'Mezzi pubblici', 'bus', 'necessaria');

  expense('Salute', 'stethoscope', CATEGORY_COLOR_PALETTE[5], 'necessaria');
  expense('Svago', 'gamepad', CATEGORY_COLOR_PALETTE[2], 'extra');
  expense('Altro', 'package', CATEGORY_COLOR_PALETTE[15], 'extra');

  return cats;
}

export const SYSTEM_CATEGORY_INVESTMENT_BUY = 'Acquisti investimenti';
export const SYSTEM_CATEGORY_INVESTMENT_SELL = 'Vendite investimenti';
