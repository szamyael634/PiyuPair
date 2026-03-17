-- Creates the KV table used by supabase/functions/server/kv_store.tsx
CREATE TABLE IF NOT EXISTS public.kv_store_824d015e (
  key text PRIMARY KEY,
  value jsonb NOT NULL
);
