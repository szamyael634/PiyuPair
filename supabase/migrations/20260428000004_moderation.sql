-- ============================================================
-- Migration: Realtime Moderation
-- ============================================================

-- --------------------------------
-- 1. Content flags (users report content)
-- --------------------------------
create table if not exists public.content_flags (
  id           uuid primary key default gen_random_uuid(),
  content_type text not null check (content_type in ('post', 'message', 'material', 'chat_message')),
  content_id   uuid not null,
  flagged_by   uuid references auth.users(id) on delete set null,
  reason       text not null,
  status       text not null default 'open' check (status in ('open', 'reviewed', 'dismissed')),
  auto_flagged boolean not null default false,
  created_at   timestamptz not null default now()
);

alter table public.content_flags enable row level security;

-- --------------------------------
-- 2. Moderation log (admin actions)
-- --------------------------------
create table if not exists public.moderation_log (
  id           uuid primary key default gen_random_uuid(),
  content_type text not null,
  content_id   uuid not null,
  action       text not null check (action in ('approved', 'removed', 'warned')),
  moderator_id uuid references auth.users(id),
  flag_id      uuid references public.content_flags(id) on delete set null,
  notes        text,
  created_at   timestamptz not null default now()
);

alter table public.moderation_log enable row level security;

-- --------------------------------
-- 3. Auto-screening trigger for newsfeed_posts
-- --------------------------------
create or replace function public.auto_screen_post()
returns trigger
language plpgsql
security definer
as $$
declare
  banned_words text[] := array[
    'spam', 'scam', 'fake', 'cheat', 'hack',
    'illegal', 'drugs', 'weapon', 'violence'
  ];
  matched_word text;
begin
  foreach matched_word in array banned_words loop
    if lower(new.content) like '%' || matched_word || '%' then
      insert into public.content_flags (
        content_type, content_id, reason, auto_flagged, status
      ) values (
        'post',
        new.id,
        'Auto-screen: contains restricted keyword [' || matched_word || ']',
        true,
        'open'
      );
      -- Don't block insertion; flag it for review
      exit;
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists auto_screen_newsfeed_post on public.newsfeed_posts;
create trigger auto_screen_newsfeed_post
  after insert on public.newsfeed_posts
  for each row execute procedure public.auto_screen_post();

-- Auto-screen chat messages as well
create or replace function public.auto_screen_chat()
returns trigger
language plpgsql
security definer
as $$
declare
  banned_words text[] := array['spam', 'scam', 'hack', 'illegal'];
  matched_word text;
begin
  foreach matched_word in array banned_words loop
    if lower(new.content) like '%' || matched_word || '%' then
      insert into public.content_flags (
        content_type, content_id, reason, auto_flagged, status
      ) values (
        'chat_message',
        new.id,
        'Auto-screen: contains restricted keyword [' || matched_word || ']',
        true,
        'open'
      );
      exit;
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists auto_screen_chat_message on public.chat_messages;
create trigger auto_screen_chat_message
  after insert on public.chat_messages
  for each row execute procedure public.auto_screen_chat();

-- --------------------------------
-- 4. Admin moderation function
-- --------------------------------
create or replace function public.moderate_content(
  p_flag_id     uuid,
  p_action      text,  -- 'approved' | 'removed' | 'warned'
  p_notes       text default null
)
returns void
language plpgsql
security definer
as $$
declare
  v_flag public.content_flags%rowtype;
begin
  -- Admin only
  if (select role from public.profiles where id = auth.uid()) != 'admin' then
    raise exception 'Access denied: admin only';
  end if;

  select * into v_flag from public.content_flags where id = p_flag_id;
  if not found then raise exception 'Flag not found'; end if;

  -- Update flag status
  update public.content_flags
  set status = 'reviewed'
  where id = p_flag_id;

  -- If removing a post, soft-delete it by blanking content
  if p_action = 'removed' and v_flag.content_type = 'post' then
    update public.newsfeed_posts
    set content = '[This post was removed by a moderator]'
    where id = v_flag.content_id;
  end if;

  -- Log the moderation action
  insert into public.moderation_log (
    content_type, content_id, action, moderator_id, flag_id, notes
  ) values (
    v_flag.content_type, v_flag.content_id, p_action, auth.uid(), p_flag_id, p_notes
  );
end;
$$;

-- --------------------------------
-- Realtime publications
-- --------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'content_flags'
  ) then
    alter publication supabase_realtime add table public.content_flags;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'moderation_log'
  ) then
    alter publication supabase_realtime add table public.moderation_log;
  end if;
end$$;
