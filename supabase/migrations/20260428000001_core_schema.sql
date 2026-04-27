-- ============================================================
-- Migration: Core Schema
-- ============================================================

create extension if not exists pgcrypto;

-- --------------------------------
-- 1. ORGANIZATIONS (must be first — profiles FK references it)
-- --------------------------------
create table if not exists public.organizations (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  unique_code    text not null unique,
  created_by     uuid references auth.users(id) on delete set null,
  created_at     timestamptz not null default now()
);

alter table public.organizations enable row level security;

-- --------------------------------
-- 2. PROFILES (extends auth.users 1:1)
-- --------------------------------
create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  full_name       text not null default '',
  email           text not null default '',
  role            text not null default 'student'
                  check (role in ('admin', 'student', 'tutor', 'organization')),
  approval_status text not null default 'pending'
                  check (approval_status in ('pending', 'approved', 'rejected')),
  organization_id uuid references public.organizations(id) on delete set null,
  avatar_url      text,
  student_id      text,
  program         text,
  year_level      text,
  department      text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Auto-create profile row on new auth.users insert
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_role text;
begin
  -- Extract role from metadata; never trust 'admin' from self-registration
  v_role := coalesce(new.raw_user_meta_data->>'role', 'student');
  if v_role = 'admin' then
    v_role := 'student';
  end if;

  insert into public.profiles (id, full_name, email, role, approval_status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.email, ''),
    v_role,
    'pending'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

-- --------------------------------
-- 3. ORG REQUESTS (for new org creation)
-- --------------------------------
create table if not exists public.org_requests (
  id             uuid primary key default gen_random_uuid(),
  org_name       text not null,
  contact_person text not null,
  email          text not null,
  message        text,
  status         text not null default 'pending'
                 check (status in ('pending', 'approved', 'rejected')),
  reviewed_by    uuid references auth.users(id),
  reviewed_at    timestamptz,
  created_at     timestamptz not null default now()
);

alter table public.org_requests enable row level security;

-- --------------------------------
-- 4. TUTOR PROFILES
-- --------------------------------
create table if not exists public.tutor_profiles (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null unique references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  approval_status text not null default 'pending'
                  check (approval_status in ('pending', 'approved', 'rejected')),
  hourly_rate     numeric(10,2) not null default 0,
  subjects        text[],
  bio             text,
  education       text,
  experience      text,
  credentials_urls text[],
  created_at      timestamptz not null default now()
);

alter table public.tutor_profiles enable row level security;

-- --------------------------------
-- 5. BOOKINGS
-- --------------------------------
create table if not exists public.bookings (
  id                uuid primary key default gen_random_uuid(),
  student_id        uuid not null references auth.users(id),
  tutor_id          uuid not null references auth.users(id),
  subject           text not null,
  topic             text,
  date              date not null,
  start_time        text not null,
  hours             integer not null default 1 check (hours > 0),
  hourly_rate       numeric(10,2) not null,
  total_amount      numeric(10,2) not null,
  status            text not null default 'pending'
                    check (status in ('pending', 'confirmed', 'cancelled', 'completed')),
  stripe_session_id text unique,
  created_at        timestamptz not null default now()
);

alter table public.bookings enable row level security;

-- --------------------------------
-- 6. SESSIONS
-- --------------------------------
create table if not exists public.sessions (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid not null unique references public.bookings(id) on delete cascade,
  jitsi_room  text,
  started_at  timestamptz,
  ended_at    timestamptz,
  created_at  timestamptz not null default now()
);

alter table public.sessions enable row level security;

-- --------------------------------
-- 7. RATINGS
-- --------------------------------
create table if not exists public.ratings (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  rated_by   uuid not null references auth.users(id),
  rated_user uuid not null references auth.users(id),
  stars      integer not null check (stars >= 1 and stars <= 5),
  comment    text,
  proof_url  text,
  created_at timestamptz not null default now(),
  unique (session_id, rated_by)
);

alter table public.ratings enable row level security;

-- --------------------------------
-- 8. LEARNING MATERIALS
-- --------------------------------
create table if not exists public.materials (
  id              uuid primary key default gen_random_uuid(),
  tutor_id        uuid not null references auth.users(id),
  organization_id uuid references public.organizations(id) on delete set null,
  title           text not null,
  file_url        text not null,
  topic           text,
  subject         text,
  approval_status text not null default 'pending'
                  check (approval_status in ('pending', 'approved', 'rejected')),
  is_open_library boolean not null default false,
  download_count  integer not null default 0,
  created_at      timestamptz not null default now()
);

alter table public.materials enable row level security;

-- --------------------------------
-- Realtime publications
-- --------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'bookings'
  ) then
    alter publication supabase_realtime add table public.bookings;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'tutor_profiles'
  ) then
    alter publication supabase_realtime add table public.tutor_profiles;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'org_requests'
  ) then
    alter publication supabase_realtime add table public.org_requests;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'profiles'
  ) then
    alter publication supabase_realtime add table public.profiles;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'materials'
  ) then
    alter publication supabase_realtime add table public.materials;
  end if;
end$$;
