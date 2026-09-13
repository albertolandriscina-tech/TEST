import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * L'app richiede un account reale (Supabase Auth + Postgres) per funzionare: senza le
 * variabili d'ambiente VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY il client non può
 * essere creato. In quel caso l'app mostra una schermata di configurazione invece di
 * andare in errore (vedi AuthPage.tsx).
 */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured ? createClient(supabaseUrl, supabaseAnonKey) : null;
