import { useState } from 'react';
import { Wallet, AlertTriangle, Mail, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { isSupabaseConfigured } from '../../lib/supabaseClient';

type Mode = 'signin' | 'signup';

function SupabaseNotConfiguredNotice() {
  return (
    <div className="card max-w-md w-full bg-amber-50 border-amber-200 text-amber-800">
      <div className="flex items-center gap-2 font-semibold mb-2">
        <AlertTriangle size={20} />
        Configurazione richiesta
      </div>
      <p className="text-sm mb-3">
        Per usare l'app con account reali serve un progetto{' '}
        <a href="https://supabase.com" target="_blank" rel="noreferrer" className="underline font-medium">
          Supabase
        </a>{' '}
        (gratuito). Crea un progetto, esegui lo script <code>supabase/schema.sql</code> nell'SQL Editor,
        quindi imposta le variabili d'ambiente:
      </p>
      <pre className="bg-white/70 rounded-lg p-3 text-xs overflow-x-auto border border-amber-200">
        VITE_SUPABASE_URL=https://tuo-progetto.supabase.co{'\n'}
        VITE_SUPABASE_ANON_KEY=la-tua-chiave-anon
      </pre>
      <p className="text-xs mt-3 text-amber-700">
        Vedi il file <code>.env.example</code> e il README per le istruzioni complete.
      </p>
    </div>
  );
}

export function AuthPage() {
  const signIn = useAuthStore((s) => s.signIn);
  const signUp = useAuthStore((s) => s.signUp);

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = useState(false);

  const submit = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError('Inserisci email e password.');
      return;
    }
    if (mode === 'signup' && password !== confirmPassword) {
      setError('Le password non coincidono.');
      return;
    }
    if (password.length < 6) {
      setError('La password deve avere almeno 6 caratteri.');
      return;
    }

    setLoading(true);
    const result = mode === 'signin' ? await signIn(email.trim(), password) : await signUp(email.trim(), password);
    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    if (mode === 'signup' && result.needsConfirmation) {
      setConfirmationSent(true);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-900">
      <div className="w-full max-w-md space-y-4">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center text-white shrink-0">
            <Wallet size={20} />
          </div>
          <span className="font-semibold text-xl text-slate-800">Finanza Personale</span>
        </div>

        {!isSupabaseConfigured ? (
          <SupabaseNotConfiguredNotice />
        ) : confirmationSent ? (
          <div className="card text-center space-y-2">
            <CheckCircle2 className="mx-auto text-emerald-600" size={32} />
            <h2 className="font-semibold text-slate-800">Controlla la tua email</h2>
            <p className="text-sm text-slate-500">
              Abbiamo inviato un link di conferma a <strong>{email}</strong>. Confermalo per poter accedere al tuo
              account.
            </p>
            <button className="btn-secondary mt-2" onClick={() => { setConfirmationSent(false); setMode('signin'); }}>
              Torna al login
            </button>
          </div>
        ) : (
          <div className="card space-y-4">
            <div className="flex rounded-lg overflow-hidden border border-slate-200 text-sm">
              <button
                className={`flex-1 py-2 font-medium ${mode === 'signin' ? 'bg-primary-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                onClick={() => { setMode('signin'); setError(null); }}
              >
                Accedi
              </button>
              <button
                className={`flex-1 py-2 font-medium ${mode === 'signup' ? 'bg-primary-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                onClick={() => { setMode('signup'); setError(null); }}
              >
                Registrati
              </button>
            </div>

            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@esempio.it"
                autoComplete="email"
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Almeno 6 caratteri"
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                onKeyDown={(e) => e.key === 'Enter' && submit()}
              />
            </div>
            {mode === 'signup' && (
              <div>
                <label className="label">Conferma password</label>
                <input
                  type="password"
                  className="input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  onKeyDown={(e) => e.key === 'Enter' && submit()}
                />
              </div>
            )}

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>
            )}

            <button className="btn-primary w-full justify-center" onClick={submit} disabled={loading}>
              <Mail size={16} />
              {loading ? 'Attendere…' : mode === 'signin' ? 'Accedi' : 'Crea account'}
            </button>

            <p className="text-xs text-slate-400 text-center">
              I tuoi dati (conti, movimenti, budget, investimenti, patrimonio) sono salvati in modo sicuro nel tuo
              account e accessibili da qualsiasi dispositivo.
            </p>
          </div>
        )}

        <a href="#/privacy" className="block text-center text-xs text-slate-400 hover:text-slate-600 hover:underline mt-4">
          Informativa sulla privacy
        </a>
      </div>
    </div>
  );
}
