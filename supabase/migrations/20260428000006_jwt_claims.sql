-- ============================================================
-- Migration: Custom JWT Claims Hook
-- Embeds user role into the JWT so RLS policies can use
-- auth.jwt() ->> 'role' without extra DB lookups.
-- ============================================================

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
security definer
as $$
declare
  claims    jsonb;
  user_role text;
begin
  -- Fetch role from profiles
  select role into user_role
  from public.profiles
  where id = (event ->> 'user_id')::uuid;

  claims := coalesce(event -> 'claims', '{}'::jsonb);

  if user_role is not null then
    claims := jsonb_set(claims, '{role}', to_jsonb(user_role));
  else
    -- Default: treat as student if no profile found yet
    claims := jsonb_set(claims, '{role}', '"student"'::jsonb);
  end if;

  return jsonb_set(event, '{claims}', claims);
end;
$$;

-- Grant the auth service permission to call this function
grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook from authenticated, anon, public;

-- ============================================================
-- HOW TO ENABLE IN config.toml (add these lines):
--
-- [auth.hook.custom_access_token]
-- enabled = true
-- uri = "pg-functions://postgres/public/custom_access_token_hook"
-- ============================================================
