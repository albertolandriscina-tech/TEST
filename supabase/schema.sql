-- Finanza Personale — schema Supabase per gli account utente.
-- Esegui questo script una sola volta nell'SQL Editor del tuo progetto Supabase
-- (supabase.com/dashboard/project/_/sql/new).
--
-- Ogni utente autenticato ha un'unica riga in questa tabella, con tutti i suoi
-- dati (conti, movimenti, budget, investimenti, patrimonio, impostazioni...)
-- salvati come JSON in "data". Le policy di Row Level Security garantiscono che
-- un utente possa leggere e scrivere solo la propria riga.

create table if not exists public.user_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_data enable row level security;

drop policy if exists "user_data_select_own" on public.user_data;
create policy "user_data_select_own"
  on public.user_data for select
  using (auth.uid() = user_id);

drop policy if exists "user_data_insert_own" on public.user_data;
create policy "user_data_insert_own"
  on public.user_data for insert
  with check (auth.uid() = user_id);

drop policy if exists "user_data_update_own" on public.user_data;
create policy "user_data_update_own"
  on public.user_data for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "user_data_delete_own" on public.user_data;
create policy "user_data_delete_own"
  on public.user_data for delete
  using (auth.uid() = user_id);
