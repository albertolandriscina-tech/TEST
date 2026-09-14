import { useEffect, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { useStore } from '../store/useStore';
import { useSyncStatus } from '../store/syncStatus';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

const SYNC_DEBOUNCE_MS = 1500;
const TABLE = 'user_data';

/** Sottoinsieme dello stato che viene salvato su Supabase (esclude azioni e selezione UI transitoria). */
function extractSyncableState(s: ReturnType<typeof useStore.getState>) {
  const {
    accounts,
    categories,
    transactions,
    budgets,
    investments,
    investmentTransactions,
    patrimonioAssets,
    recurringTransactions,
    portfolioSnapshots,
    categorizationRules,
    dashboardLayout,
    hiddenDashboardWidgets,
    settings,
  } = s;
  return {
    accounts,
    categories,
    transactions,
    budgets,
    investments,
    investmentTransactions,
    patrimonioAssets,
    recurringTransactions,
    portfolioSnapshots,
    categorizationRules,
    dashboardLayout,
    hiddenDashboardWidgets,
    settings,
  };
}

async function saveNow(userId: string, state: ReturnType<typeof useStore.getState>) {
  if (!supabase) return;
  useSyncStatus.setState({ status: 'saving' });
  const { error } = await supabase
    .from(TABLE)
    .upsert({ user_id: userId, data: extractSyncableState(state), updated_at: new Date().toISOString() });
  useSyncStatus.setState(
    error ? { status: 'error', errorMessage: error.message } : { status: 'saved', errorMessage: null }
  );
}

/**
 * Carica i dati dell'utente autenticato da Supabase e li mantiene sincronizzati: ogni
 * modifica allo store viene salvata (con un breve debounce) sulla sua riga in
 * `user_data`. Un account nuovo di zecca (nessuna riga esistente) viene popolato con i
 * dati di esempio come primo avvio. Al logout lo stato locale viene azzerato, così i
 * dati di un utente non restano visibili al successivo che accede dallo stesso browser.
 */
const PREVIEW_SKIP_AUTH = import.meta.env.VITE_PREVIEW_SKIP_AUTH === 'true';

export function useCloudSync() {
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const suppressRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeUserRef = useRef<string | null>(null);

  useEffect(() => {
    if (PREVIEW_SKIP_AUTH || !isSupabaseConfigured || !supabase) return;

    if (!userId) {
      activeUserRef.current = null;
      useStore.getState().resetAllData();
      useSyncStatus.setState({ status: 'idle', errorMessage: null });
      return;
    }

    let cancelled = false;
    activeUserRef.current = userId;
    useSyncStatus.setState({ status: 'loading', errorMessage: null });

    (async () => {
      const { data, error } = await supabase.from(TABLE).select('data').eq('user_id', userId).maybeSingle();
      if (cancelled) return;

      suppressRef.current = true;
      if (!error && data?.data) {
        useStore.setState(data.data as Partial<ReturnType<typeof useStore.getState>>);
        suppressRef.current = false;
        useSyncStatus.setState({ status: 'saved', errorMessage: null });
      } else {
        // Nessun dato salvato per questo utente: è un account nuovo, lo popoliamo con
        // i dati di esempio e li salviamo subito come primo stato.
        useStore.getState().loadDemoData();
        await saveNow(userId, useStore.getState());
        suppressRef.current = false;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (PREVIEW_SKIP_AUTH || !isSupabaseConfigured || !supabase) return;

    const unsubscribe = useStore.subscribe((state) => {
      const uid = activeUserRef.current;
      if (!uid || suppressRef.current) return;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        void saveNow(uid, state);
      }, SYNC_DEBOUNCE_MS);
    });

    return () => {
      unsubscribe();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);
}
