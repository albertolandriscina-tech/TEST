# Finanza Personale

App web per la gestione delle finanze personali: entrate/uscite mensili, conti bancari in partita
doppia, categorie e sottocategorie, budget mensili/annuali, investimenti (ETF, fondi, azioni,
obbligazioni), patrimonio (immobili, auto, altri beni), bilancio con quadratura di controllo e
movimenti ricorrenti.

## Stack

React + TypeScript + Vite, Tailwind CSS, Zustand (con persistenza in `localStorage`), Recharts.

Tutti i dati restano nel browser dell'utente (nessun backend/server).

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
