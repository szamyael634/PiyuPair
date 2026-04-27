create extension if not exists pgcrypto;

create table if not exists public.newsfeed_posts (
  id uuid primary key default gen_random_uuid(),
  author_name text not null,
  author_role text not null,
  author_avatar text not null,
  post_type text not null default 'question',
  content text not null,
  likes_count integer not null default 0,
  comments_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  chat_id text not null,
  sender_name text not null,
  content text not null,
  is_own boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.study_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subject text not null,
  description text not null,
  admin_name text not null,
  member_count integer not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists public.study_group_messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.study_groups(id) on delete cascade,
  sender_name text not null,
  sender_initials text not null,
  message_text text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.study_group_files (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.study_groups(id) on delete cascade,
  file_name text not null,
  shared_by text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.classroom_activities (
  id uuid primary key default gen_random_uuid(),
  classroom_id text not null,
  title text not null,
  description text not null,
  due_date date not null,
  status text not null default 'pending',
  total_students integer not null default 18,
  created_at timestamptz not null default now()
);

create table if not exists public.classroom_submissions (
  id uuid primary key default gen_random_uuid(),
  classroom_id text not null,
  activity_id text not null,
  file_name text not null,
  note text,
  created_at timestamptz not null default now()
);

alter table public.newsfeed_posts enable row level security;
alter table public.chat_messages enable row level security;
alter table public.study_groups enable row level security;
alter table public.study_group_messages enable row level security;
alter table public.study_group_files enable row level security;
alter table public.classroom_activities enable row level security;
alter table public.classroom_submissions enable row level security;

drop policy if exists "newsfeed read" on public.newsfeed_posts;
create policy "newsfeed read" on public.newsfeed_posts for select using (true);
drop policy if exists "newsfeed insert" on public.newsfeed_posts;
create policy "newsfeed insert" on public.newsfeed_posts for insert with check (true);

drop policy if exists "chat read" on public.chat_messages;
create policy "chat read" on public.chat_messages for select using (true);
drop policy if exists "chat insert" on public.chat_messages;
create policy "chat insert" on public.chat_messages for insert with check (true);

drop policy if exists "study groups read" on public.study_groups;
create policy "study groups read" on public.study_groups for select using (true);
drop policy if exists "study groups insert" on public.study_groups;
create policy "study groups insert" on public.study_groups for insert with check (true);

drop policy if exists "study group messages read" on public.study_group_messages;
create policy "study group messages read" on public.study_group_messages for select using (true);
drop policy if exists "study group messages insert" on public.study_group_messages;
create policy "study group messages insert" on public.study_group_messages for insert with check (true);

drop policy if exists "study group files read" on public.study_group_files;
create policy "study group files read" on public.study_group_files for select using (true);
drop policy if exists "study group files insert" on public.study_group_files;
create policy "study group files insert" on public.study_group_files for insert with check (true);

drop policy if exists "classroom activities read" on public.classroom_activities;
create policy "classroom activities read" on public.classroom_activities for select using (true);
drop policy if exists "classroom activities insert" on public.classroom_activities;
create policy "classroom activities insert" on public.classroom_activities for insert with check (true);

drop policy if exists "classroom submissions read" on public.classroom_submissions;
create policy "classroom submissions read" on public.classroom_submissions for select using (true);
drop policy if exists "classroom submissions insert" on public.classroom_submissions;
create policy "classroom submissions insert" on public.classroom_submissions for insert with check (true);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'newsfeed_posts'
  ) then
    alter publication supabase_realtime add table public.newsfeed_posts;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'chat_messages'
  ) then
    alter publication supabase_realtime add table public.chat_messages;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'study_groups'
  ) then
    alter publication supabase_realtime add table public.study_groups;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'study_group_messages'
  ) then
    alter publication supabase_realtime add table public.study_group_messages;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'study_group_files'
  ) then
    alter publication supabase_realtime add table public.study_group_files;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'classroom_activities'
  ) then
    alter publication supabase_realtime add table public.classroom_activities;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'classroom_submissions'
  ) then
    alter publication supabase_realtime add table public.classroom_submissions;
  end if;
end
$$;
