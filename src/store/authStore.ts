import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

interface SignResult {
  error: string | null;
  needsConfirmation?: boolean;
}

interface AuthState {
  session: Session | null;
  user: User | null;
  initializing: boolean; // true finché non si è verificato se esiste già una sessione
  signUp: (email: string, password: string) => Promise<SignResult>;
  signIn: (email: string, password: string) => Promise<SignResult>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>(() => ({
  session: null,
  user: null,
  initializing: true,

  signUp: async (email, password) => {
    if (!supabase) return { error: 'Supabase non configurato.' };
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message };
    return { error: null, needsConfirmation: !data.session };
  },

  signIn: async (email, password) => {
    if (!supabase) return { error: 'Supabase non configurato.' };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? error.message : null };
  },

  signOut: async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  },
}));

if (isSupabaseConfigured && supabase) {
  supabase.auth.getSession().then(({ data }) => {
    useAuthStore.setState({ session: data.session, user: data.session?.user ?? null, initializing: false });
  });
  supabase.auth.onAuthStateChange((_event, session) => {
    useAuthStore.setState({ session, user: session?.user ?? null, initializing: false });
  });
} else {
  useAuthStore.setState({ initializing: false });
}
