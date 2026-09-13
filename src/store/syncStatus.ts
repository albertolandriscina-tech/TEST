import { create } from 'zustand';

export type SyncStatus = 'idle' | 'loading' | 'saving' | 'saved' | 'error';

interface SyncStatusState {
  status: SyncStatus;
  errorMessage: string | null;
}

/** Stato di sincronizzazione con Supabase, mostrato nella Sidebar (vedi hooks/useCloudSync.ts). */
export const useSyncStatus = create<SyncStatusState>(() => ({
  status: 'idle',
  errorMessage: null,
}));
