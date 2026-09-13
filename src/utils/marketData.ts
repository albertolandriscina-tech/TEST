/**
 * Recupero quotazioni reali da Yahoo Finance. L'endpoint "chart" non richiede
 * chiave API ed è quello usato da molti progetti open source per ottenere
 * l'ultimo prezzo da browser; alcuni contesti di hosting/browser possono però
 * bloccare la richiesta (CORS, policy di rete, sandbox senza accesso a
 * internet come l'anteprima Artifact) — in quel caso la chiamata fallisce e
 * chi la usa deve prevedere un fallback (vedi priceSimulation.ts).
 */
export interface LiveQuote {
  price: number;
  currency?: string;
}

const FETCH_TIMEOUT_MS = 6000;

export async function fetchYahooQuote(ticker: string): Promise<LiveQuote | null> {
  if (!ticker.trim()) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker.trim())}?interval=1d&range=1d`;
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    const data = await res.json();
    const result = data?.chart?.result?.[0];
    const price = result?.meta?.regularMarketPrice;
    const currency = result?.meta?.currency as string | undefined;
    if (typeof price !== 'number' || Number.isNaN(price)) return null;
    return { price, currency };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
