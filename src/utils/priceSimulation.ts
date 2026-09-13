import type { Investment, InvestmentType } from '../types';

/**
 * Questa applicazione è client-only (nessun backend) e gira anche in sandbox
 * statiche che bloccano le chiamate di rete verso API di mercato esterne: un
 * vero fetch di quotazioni real-time non è quindi affidabile in ogni contesto
 * di esecuzione. L'aggiornamento automatico simula un movimento di prezzo
 * realistico (random walk) calibrato sulla volatilità tipica di ogni
 * categoria di strumento, così da poter comunque testare ed usare la
 * funzionalità end-to-end senza dipendere da chiavi API o servizi terzi.
 */
const DAILY_VOLATILITY: Record<InvestmentType, number> = {
  bond: 0.0025,
  etf: 0.011,
  fund: 0.008,
  stock: 0.02,
};

/** Rumore pseudo-gaussiano in [-1, 1] circa, centrato su 0 (somma di uniformi). */
function gaussianNoise(): number {
  return ((Math.random() + Math.random() + Math.random() - 1.5) / 1.5) * 1.5;
}

export function simulateNewPrice(investment: Investment): number {
  const volatility = DAILY_VOLATILITY[investment.type];
  const changePct = gaussianNoise() * volatility;
  const newPrice = investment.currentPrice * (1 + changePct);
  return Math.max(0.0001, Math.round(newPrice * 10000) / 10000);
}

/** Applica un aggiornamento simulato delle quotazioni a tutti gli strumenti passati. */
export function refreshPrices(investments: Investment[]): Investment[] {
  const now = new Date().toISOString();
  return investments.map((inv) => ({
    ...inv,
    currentPrice: simulateNewPrice(inv),
    lastUpdated: now,
  }));
}
