-- ============================================================
-- Seed: First Admin User
--
-- INSTRUCTIONS (run AFTER supabase db push or db reset):
--
-- 1. Sign up through the app with your admin email/password,
--    OR create the user via Supabase Dashboard → Auth → Users → Invite.
--
-- 2. Then run this SQL (replace the email):
--
--    UPDATE public.profiles
--    SET role = 'admin', approval_status = 'approved'
--    WHERE email = 'your-admin@example.com';
--
-- 3. Sign in — you'll be routed to /dashboard/admin.
--
-- Alternatively, if you want to seed a demo admin directly:
-- ============================================================

-- NOTE: auth.users rows cannot be inserted via SQL in Supabase hosted projects.
-- Use Supabase Dashboard or the Admin API to create the user first,
-- then run the UPDATE below.

-- Example (uncomment and replace email after user is created in Auth):
-- UPDATE public.profiles
-- SET role = 'admin', approval_status = 'approved'
-- WHERE email = 'admin@piyupair.com';

-- ============================================================
-- Seed: Demo Organization (for local development only)
-- Creates an org with code ORG-EXCEL that tutors can use during testing.
-- ============================================================
insert into public.organizations (name, unique_code)
values ('Excellence Tutoring Center', 'ORG-EXCEL')
on conflict (unique_code) do nothing;
