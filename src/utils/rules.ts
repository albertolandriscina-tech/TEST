import type { CategorizationRule, TransactionType } from '../types';

/** Confronto tollerante: minuscolo e senza accenti, così "perche'"/"perché" o
 * "Carburante"/"carburante" si comportano allo stesso modo. */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

export interface RuleMatchInput {
  description: string;
  type: TransactionType;
  accountId: string;
}

/** Restituisce la prima regola attiva che corrisponde all'input (le regole sono valutate
 * nell'ordine dell'array, come le categorie: la prima corrispondenza vince), oppure null
 * se nessuna regola scatta. I giroconti non vengono mai categorizzati automaticamente. */
export function findMatchingRule(rules: CategorizationRule[], input: RuleMatchInput): CategorizationRule | null {
  if (input.type === 'transfer') return null;
  const normalizedDescription = normalize(input.description);
  if (!normalizedDescription) return null;

  for (const rule of rules) {
    if (!rule.active) continue;
    if (rule.matchType !== 'any' && rule.matchType !== input.type) continue;
    if (rule.accountId && rule.accountId !== input.accountId) continue;
    const matches = rule.keywords.some((kw) => {
      const normalizedKeyword = normalize(kw.trim());
      return normalizedKeyword.length > 0 && normalizedDescription.includes(normalizedKeyword);
    });
    if (matches) return rule;
  }
  return null;
}
