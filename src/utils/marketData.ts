/**
 * Recupero quotazioni reali da Yahoo Finance. L'endpoint "chart" non richiede
 * chiave API ma non invia header CORS: chiamarlo direttamente dal browser
 * viene sempre bloccato dal browser stesso (non è un problema di rete o di
 * sandbox). Per questo la richiesta passa da un proxy same-origin: in
 * sviluppo è Vite (vedi server.proxy in vite.config.ts), in produzione la
 * funzione serverless api/quote.ts. Se comunque non disponibile, chi usa
 * questa funzione deve prevedere un fallback (vedi priceSimulation.ts).
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
    const url = `/api/quote?ticker=${encodeURIComponent(ticker.trim())}`;
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
