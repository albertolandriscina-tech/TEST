import { ArrowLeft, Wallet } from 'lucide-react';

const LAST_UPDATED = '14 settembre 2026';

/**
 * Pagina pubblica (accessibile senza login, vedi App.tsx) richiesta per la pubblicazione
 * sul Play Store: la sezione "Sicurezza dei dati" della Play Console vuole un link
 * pubblico a questa informativa. I placeholder [DA COMPILARE] vanno sostituiti con i
 * dati reali del titolare del trattamento prima della pubblicazione: non è un parere
 * legale, solo una bozza da far rivedere se necessario.
 */
export function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center text-white shrink-0">
            <Wallet size={18} />
          </div>
          <span className="font-extrabold tracking-tight text-slate-800">Finanza Personale</span>
        </div>

        <div className="card space-y-5 text-sm text-slate-600 leading-relaxed">
          <div>
            <h1 className="text-xl font-extrabold text-slate-800 mb-1">Informativa sulla privacy</h1>
            <p className="text-xs text-slate-400">Ultimo aggiornamento: {LAST_UPDATED}</p>
          </div>

          <section>
            <h2 className="font-semibold text-slate-700 mb-1">Titolare del trattamento</h2>
            <p>[DA COMPILARE: nome/ragione sociale] — [DA COMPILARE: email di contatto]</p>
          </section>

          <section>
            <h2 className="font-semibold text-slate-700 mb-1">Quali dati raccogliamo</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Dati dell'account:</strong> indirizzo email e password, usati esclusivamente per
                l'autenticazione (la password non è mai visibile al titolare: viene gestita in forma cifrata dal
                fornitore del servizio di autenticazione).
              </li>
              <li>
                <strong>Dati finanziari inseriti volontariamente:</strong> conti, movimenti, categorie, budget,
                investimenti e beni patrimoniali che l'utente registra nell'app per usarne le funzionalità.
              </li>
              <li>
                <strong>Nessun dato di localizzazione, contatti o altri permessi del dispositivo</strong> viene
                richiesto o raccolto dall'app.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-slate-700 mb-1">Dove vengono conservati i dati</h2>
            <p>
              I dati sono conservati su Supabase, un fornitore di infrastruttura cloud (database e autenticazione)
              che agisce come responsabile del trattamento per conto del titolare. Le connessioni tra l'app e
              Supabase avvengono sempre in modo cifrato (HTTPS).
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-slate-700 mb-1">Condivisione con terzi</h2>
            <p>
              I dati finanziari inseriti dall'utente non vengono venduti né condivisi con terzi a scopo pubblicitario.
              L'app interroga Yahoo Finance solo per ottenere quotazioni pubbliche di mercato relative ai ticker che
              l'utente inserisce per i propri investimenti: questa richiesta non include alcun dato personale
              dell'utente.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-slate-700 mb-1">Conservazione e cancellazione</h2>
            <p>
              I dati restano associati all'account finché questo è attivo. L'utente può richiedere in qualsiasi
              momento la cancellazione definitiva del proprio account e di tutti i dati collegati scrivendo a
              [DA COMPILARE: email di contatto].
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-slate-700 mb-1">Diritti dell'utente</h2>
            <p>
              In qualità di interessato, l'utente può richiedere in ogni momento l'accesso, la rettifica, la
              portabilità o la cancellazione dei propri dati, contattando il titolare ai recapiti indicati sopra.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-slate-700 mb-1">Sicurezza</h2>
            <p>
              L'accesso ai dati richiede l'autenticazione con email e password; ogni utente può vedere e modificare
              esclusivamente i propri dati. Le comunicazioni tra app e server avvengono sempre tramite connessione
              cifrata (HTTPS/TLS).
            </p>
          </section>
        </div>

        <a href="#/" className="inline-flex items-center gap-1.5 text-sm text-primary-600 hover:underline mt-4">
          <ArrowLeft size={14} /> Torna all'app
        </a>
      </div>
    </div>
  );
}
