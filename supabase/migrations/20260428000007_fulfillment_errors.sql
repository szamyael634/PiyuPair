-- ============================================================
-- Migration: Fulfillment Error Log
-- For tracking webhook fulfillment failures for manual reconciliation.
-- ============================================================

create table if not exists public.fulfillment_errors (
  id                uuid primary key default gen_random_uuid(),
  stripe_session_id text not null,
  error_message     text not null,
  raw_metadata      jsonb,
  resolved          boolean not null default false,
  created_at        timestamptz not null default now()
);

alter table public.fulfillment_errors enable row level security;

-- Only admins can read/manage fulfillment errors
drop policy if exists "fulfillment_errors_admin" on public.fulfillment_errors;
create policy "fulfillment_errors_admin" on public.fulfillment_errors
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Service role (used by webhook) bypasses RLS so can always insert
