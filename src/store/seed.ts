import type { Category } from '../types';
import { newId } from '../utils/id';

/** Categorie di default proposte al primo avvio, con alcune sottocategorie di esempio. */
export function buildDefaultCategories(): Category[] {
  const cats: Category[] = [];

  const income = (name: string) => {
    const c: Category = { id: newId(), name, kind: 'income', parentId: null };
    cats.push(c);
    return c;
  };
  const expense = (name: string) => {
    const c: Category = { id: newId(), name, kind: 'expense', parentId: null };
    cats.push(c);
    return c;
  };
  const sub = (parent: Category, name: string) => {
    const c: Category = { id: newId(), name, kind: parent.kind, parentId: parent.id };
    cats.push(c);
    return c;
  };

  income('Stipendio');
  income('Altri redditi');

  const casa = expense('Casa');
  sub(casa, 'Affitto/Mutuo');
  sub(casa, 'Bollette');
  sub(casa, 'Manutenzione');

  const alimentari = expense('Alimentari');
  sub(alimentari, 'Supermercato');
  sub(alimentari, 'Ristoranti');

  const trasporti = expense('Trasporti');
  sub(trasporti, 'Carburante');
  sub(trasporti, 'Mezzi pubblici');

  expense('Salute');
  expense('Svago');
  expense('Altro');

  return cats;
}

export const SYSTEM_CATEGORY_INVESTMENT_BUY = 'Acquisti investimenti';
export const SYSTEM_CATEGORY_INVESTMENT_SELL = 'Vendite investimenti';
