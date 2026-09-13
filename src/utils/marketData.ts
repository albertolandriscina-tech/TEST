import type { InvestmentType } from '../types';

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

/** Dati identificativi dello strumento, recuperati dal ticker per precompilare il form. */
export interface InstrumentInfo {
  name?: string;
  currency?: string;
  price?: number;
  type?: InvestmentType;
  exchange?: string;
}

const FETCH_TIMEOUT_MS = 6000;

// Yahoo Finance classifica lo strumento con "instrumentType": mappiamo solo i casi in
// cui possiamo dedurre con sicurezza uno dei quattro tipi gestiti dall'app.
const INSTRUMENT_TYPE_MAP: Record<string, InvestmentType> = {
  EQUITY: 'stock',
  ETF: 'etf',
  MUTUALFUND: 'fund',
};

async function fetchYahooChartMeta(ticker: string): Promise<Record<string, unknown> | null> {
  if (!ticker.trim()) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const url = `/api/quote?ticker=${encodeURIComponent(ticker.trim())}`;
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.chart?.result?.[0]?.meta ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchYahooQuote(ticker: string): Promise<LiveQuote | null> {
  const meta = await fetchYahooChartMeta(ticker);
  const price = meta?.regularMarketPrice;
  const currency = meta?.currency as string | undefined;
  if (typeof price !== 'number' || Number.isNaN(price)) return null;
  return { price, currency };
}

/**
 * Recupera nome, valuta, tipo (se deducibile) e prezzo corrente a partire dal ticker,
 * per precompilare automaticamente il form di inserimento di un nuovo strumento.
 */
export async function fetchInstrumentInfo(ticker: string): Promise<InstrumentInfo | null> {
  const meta = await fetchYahooChartMeta(ticker);
  if (!meta) return null;
  const price = meta.regularMarketPrice;
  const instrumentType = meta.instrumentType as string | undefined;
  const info: InstrumentInfo = {
    name: (meta.longName ?? meta.shortName) as string | undefined,
    currency: meta.currency as string | undefined,
    price: typeof price === 'number' && !Number.isNaN(price) ? price : undefined,
    type: instrumentType ? INSTRUMENT_TYPE_MAP[instrumentType] : undefined,
    exchange: (meta.fullExchangeName ?? meta.exchangeName) as string | undefined,
  };
  if (!info.name && !info.currency && info.price === undefined) return null;
  return info;
}
