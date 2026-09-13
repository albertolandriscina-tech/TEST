# Finanza Personale

App web per la gestione delle finanze personali: entrate/uscite mensili, conti bancari in partita
doppia, categorie e sottocategorie, budget mensili/annuali, investimenti (ETF, fondi, azioni,
obbligazioni), patrimonio (immobili, auto, altri beni), bilancio con quadratura di controllo e
movimenti ricorrenti.

## Stack

React + TypeScript + Vite, Tailwind CSS, Zustand, Recharts, Supabase (autenticazione + database).

Ogni utente ha un proprio account: i dati sono salvati sul server (Postgres, tramite
Supabase) e accessibili da qualsiasi dispositivo dopo il login.

## Configurazione account (Supabase)

L'app richiede un progetto [Supabase](https://supabase.com) (piano gratuito sufficiente):

1. Crea un nuovo progetto su [supabase.com/dashboard](https://supabase.com/dashboard).
2. Apri l'**SQL Editor** del progetto ed esegui il contenuto di [`supabase/schema.sql`](supabase/schema.sql)
   per creare la tabella `user_data` e le policy di sicurezza (ogni utente vede solo i propri dati).
3. In **Project Settings → API** copia "Project URL" e la chiave "anon public".
4. Copia `.env.example` in `.env` e compila le due variabili:
   ```
   VITE_SUPABASE_URL=https://tuo-progetto.supabase.co
   VITE_SUPABASE_ANON_KEY=la-tua-chiave-anon
   ```
5. Se pubblichi l'app (Vercel, Netlify, GitHub Pages con build a parte, ecc.), imposta le stesse
   due variabili d'ambiente nella piattaforma di hosting: sono lette a tempo di build da Vite.

Senza queste variabili l'app mostra una schermata di configurazione al posto del login.

Per email di conferma: Supabase richiede di default la conferma via email alla registrazione
(configurabile in **Authentication → Settings** del progetto).

## Quotazioni in tempo reale (Yahoo Finance)

Yahoo Finance non permette di essere chiamato direttamente dal browser (nessun header CORS),
quindi le richieste passano da un piccolo proxy same-origin:

- in sviluppo (`npm run dev`) è Vite stesso a fare da proxy (vedi `server.proxy` in
  `vite.config.ts`) — funziona senza configurazione aggiuntiva;
- se pubblichi su **Vercel**, la funzione serverless [`api/quote.ts`](api/quote.ts) fa lo stesso
  lavoro in produzione, senza bisogno di ulteriore configurazione;
- se pubblichi altrove (Netlify, GitHub Pages, ecc.) serve un equivalente di `api/quote.ts` nel
  formato richiesto da quella piattaforma, altrimenti le quotazioni live non funzionano e l'app
  userà automaticamente prezzi simulati come fallback.

## Sviluppo

```bash
npm install
npm run dev      # avvia il server di sviluppo
npm run build    # build di produzione in dist/
npm run lint     # type-check TypeScript
```

## Funzionalità principali

- **Dashboard**: andamento mensile entrate/uscite, ripartizione spese per categoria, patrimonio netto.
- **Conti**: conti bancari, contanti, conto titoli, carte di credito; saldi calcolati in partita doppia.
- **Movimenti**: inserimento con importo sempre positivo — il segno (dare/avere) è dedotto
  automaticamente dal tipo di movimento (entrata/uscita/giroconto). Selezione multipla e cancellazione
  in blocco.
- **Categorie**: entrate/uscite con sottocategorie.
- **Budget**: per categoria, vista mensile e vista annuale (somma dei 12 budget mensili).
- **Investimenti**: ETF, fondi, azioni, obbligazioni con acquisti/vendite dal conto corrente titoli
  dedicato; calcolo di prezzo medio, valore corrente e plus/minusvalenza.
- **Patrimonio**: immobili, auto e altri beni che contribuiscono al patrimonio netto.
- **Bilancio**: stato patrimoniale (attività/passività/patrimonio netto) con quadratura di controllo
  della partita doppia.
- **Movimenti ricorrenti**: regole di entrate/uscite/giroconti ripetuti, generati automaticamente
  all'apertura dell'app.
