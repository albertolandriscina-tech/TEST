// Funzione serverless (formato Vercel) usata solo quando l'app è pubblicata online.
// Fa da proxy verso Yahoo Finance lato server: il browser chiama questo stesso
// dominio (nessun problema di CORS), e questa funzione inoltra la richiesta a
// Yahoo, che invece non permette chiamate dirette da browser.
// I ticker Yahoo Finance sono alfanumerici con al più punto/trattino/caret come
// separatori (es. "AAPL", "SWDA.MI", "^GSPC", "BRK-B"): un formato più permissivo non
// serve e riduce l'uso di questo endpoint pubblico come proxy generico verso terzi.
const TICKER_PATTERN = /^[A-Za-z0-9.\-^=]{1,20}$/;

export default async function handler(req: any, res: any) {
  const ticker = typeof req.query?.ticker === 'string' ? req.query.ticker.trim() : '';
  if (!ticker || !TICKER_PATTERN.test(ticker)) {
    res.status(400).json({ error: 'Parametro "ticker" mancante o non valido.' });
    return;
  }

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`;
    const upstream = await fetch(url);
    if (!upstream.ok) {
      res.status(upstream.status).json({ error: 'Yahoo Finance non ha risposto correttamente.' });
      return;
    }
    const data = await upstream.json();
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    res.status(200).json(data);
  } catch {
    res.status(502).json({ error: 'Impossibile contattare Yahoo Finance.' });
  }
}
