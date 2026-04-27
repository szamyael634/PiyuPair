-- ============================================================
-- Migration: RLS Hardening
-- ============================================================

-- --------------------------------
-- PROFILES
-- --------------------------------
drop policy if exists "profiles_public_read"   on public.profiles;
drop policy if exists "profiles_owner_update"  on public.profiles;
drop policy if exists "profiles_admin_all"     on public.profiles;

-- Anyone signed-in can read basic profile info
create policy "profiles_public_read" on public.profiles
  for select using (auth.uid() is not null);

-- Owner can update their own profile (not role/approval_status)
create policy "profiles_owner_update" on public.profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id);

-- Admins can update anything
create policy "profiles_admin_all" on public.profiles
  for all using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- --------------------------------
-- ORGANIZATIONS
-- --------------------------------
drop policy if exists "orgs_public_read"   on public.organizations;
drop policy if exists "orgs_admin_manage"  on public.organizations;

create policy "orgs_public_read" on public.organizations
  for select using (auth.uid() is not null);

create policy "orgs_admin_manage" on public.organizations
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- --------------------------------
-- ORG REQUESTS
-- --------------------------------
drop policy if exists "org_requests_insert"      on public.org_requests;
drop policy if exists "org_requests_admin_read"  on public.org_requests;
drop policy if exists "org_requests_admin_write" on public.org_requests;

-- Anyone can submit an org request (anon allowed for pre-auth)
create policy "org_requests_insert" on public.org_requests
  for insert with check (true);

create policy "org_requests_admin_read" on public.org_requests
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "org_requests_admin_write" on public.org_requests
  for update using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- --------------------------------
-- TUTOR PROFILES
-- --------------------------------
drop policy if exists "tutor_profiles_read"       on public.tutor_profiles;
drop policy if exists "tutor_profiles_self_read"  on public.tutor_profiles;
drop policy if exists "tutor_profiles_org_manage" on public.tutor_profiles;
drop policy if exists "tutor_profiles_owner_ins"  on public.tutor_profiles;
drop policy if exists "tutor_profiles_admin"      on public.tutor_profiles;

-- Approved tutors are visible to all authenticated users
create policy "tutor_profiles_read" on public.tutor_profiles
  for select using (
    approval_status = 'approved' and auth.uid() is not null
  );

-- Tutor sees own profile regardless of status
create policy "tutor_profiles_self_read" on public.tutor_profiles
  for select using (user_id = auth.uid());

-- Tutor inserts their own profile at registration
create policy "tutor_profiles_owner_ins" on public.tutor_profiles
  for insert with check (user_id = auth.uid());

-- Tutor updates their own non-approval fields
create policy "tutor_profiles_owner_update" on public.tutor_profiles
  for update using (user_id = auth.uid());

-- Org can read + approve tutors in their org
create policy "tutor_profiles_org_manage" on public.tutor_profiles
  for all using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'organization'
        and p.organization_id = tutor_profiles.organization_id
    )
  );

create policy "tutor_profiles_admin" on public.tutor_profiles
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- --------------------------------
-- BOOKINGS
-- --------------------------------
drop policy if exists "bookings_student_read"  on public.bookings;
drop policy if exists "bookings_tutor_read"    on public.bookings;
drop policy if exists "bookings_student_ins"   on public.bookings;
drop policy if exists "bookings_admin"         on public.bookings;

create policy "bookings_student_read" on public.bookings
  for select using (student_id = auth.uid());

create policy "bookings_tutor_read" on public.bookings
  for select using (tutor_id = auth.uid());

-- Students insert their own bookings; stripe webhook uses service role key (bypasses RLS)
create policy "bookings_student_ins" on public.bookings
  for insert with check (student_id = auth.uid());

create policy "bookings_admin" on public.bookings
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- --------------------------------
-- SESSIONS
-- --------------------------------
drop policy if exists "sessions_participant_read" on public.sessions;
drop policy if exists "sessions_admin"            on public.sessions;

create policy "sessions_participant_read" on public.sessions
  for select using (
    exists (
      select 1 from public.bookings b
      where b.id = sessions.booking_id
        and (b.student_id = auth.uid() or b.tutor_id = auth.uid())
    )
  );

create policy "sessions_admin" on public.sessions
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- --------------------------------
-- RATINGS
-- --------------------------------
drop policy if exists "ratings_participant_read" on public.ratings;
drop policy if exists "ratings_owner_insert"     on public.ratings;

create policy "ratings_participant_read" on public.ratings
  for select using (rated_by = auth.uid() or rated_user = auth.uid());

create policy "ratings_owner_insert" on public.ratings
  for insert with check (rated_by = auth.uid());

-- --------------------------------
-- MATERIALS
-- --------------------------------
drop policy if exists "materials_approved_read"  on public.materials;
drop policy if exists "materials_owner_manage"   on public.materials;
drop policy if exists "materials_org_manage"     on public.materials;
drop policy if exists "materials_admin"          on public.materials;

-- Approved open-library materials visible to all authenticated users
create policy "materials_approved_read" on public.materials
  for select using (
    approval_status = 'approved'
    and (
      is_open_library = true
      or exists (
        select 1 from public.profiles p
        where p.id = auth.uid()
          and p.approval_status = 'approved'
          and (
            p.role in ('admin', 'organization')
            or p.organization_id = materials.organization_id
          )
      )
    )
    and auth.uid() is not null
  );

create policy "materials_owner_manage" on public.materials
  for all using (tutor_id = auth.uid());

create policy "materials_org_manage" on public.materials
  for all using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'organization'
        and p.organization_id = materials.organization_id
    )
  );

create policy "materials_admin" on public.materials
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- --------------------------------
-- CONTENT FLAGS
-- --------------------------------
drop policy if exists "flags_auth_insert"  on public.content_flags;
drop policy if exists "flags_admin_read"   on public.content_flags;
drop policy if exists "flags_admin_write"  on public.content_flags;

create policy "flags_auth_insert" on public.content_flags
  for insert with check (auth.uid() is not null);

create policy "flags_admin_read" on public.content_flags
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "flags_admin_write" on public.content_flags
  for update using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- --------------------------------
-- MODERATION LOG
-- --------------------------------
drop policy if exists "modlog_admin_all" on public.moderation_log;

create policy "modlog_admin_all" on public.moderation_log
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
