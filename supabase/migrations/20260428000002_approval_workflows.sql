-- ============================================================
-- Migration: Approval Workflows
-- ============================================================

-- --------------------------------
-- Admin: approve or reject a student
-- --------------------------------
create or replace function public.approve_student(
  p_student_id uuid,
  p_status text  -- 'approved' | 'rejected'
)
returns void
language plpgsql
security definer
as $$
begin
  -- Only admins can call this
  if (select role from public.profiles where id = auth.uid()) != 'admin' then
    raise exception 'Access denied: admin only';
  end if;

  if p_status not in ('approved', 'rejected') then
    raise exception 'Invalid status: must be approved or rejected';
  end if;

  update public.profiles
  set approval_status = p_status
  where id = p_student_id
    and role = 'student';
end;
$$;

-- --------------------------------
-- Organization: approve or reject a tutor
-- --------------------------------
create or replace function public.approve_tutor(
  p_tutor_id uuid,
  p_status   text  -- 'approved' | 'rejected'
)
returns void
language plpgsql
security definer
as $$
declare
  v_caller_org uuid;
  v_tutor_org  uuid;
begin
  -- Caller must be an organization
  select organization_id into v_caller_org
  from public.profiles
  where id = auth.uid() and role = 'organization';

  if v_caller_org is null then
    raise exception 'Access denied: organization only';
  end if;

  -- Tutor must belong to caller's organization
  select organization_id into v_tutor_org
  from public.tutor_profiles
  where user_id = p_tutor_id;

  if v_tutor_org is distinct from v_caller_org then
    raise exception 'Access denied: tutor does not belong to your organization';
  end if;

  if p_status not in ('approved', 'rejected') then
    raise exception 'Invalid status';
  end if;

  -- Update tutor_profiles
  update public.tutor_profiles
  set approval_status = p_status
  where user_id = p_tutor_id;

  -- Mirror on profiles so login check works consistently
  update public.profiles
  set approval_status = p_status
  where id = p_tutor_id;
end;
$$;

-- --------------------------------
-- Admin: approve or reject an org request and optionally create org + profile
-- --------------------------------
create or replace function public.approve_org_request(
  p_request_id uuid,
  p_org_code   text  -- unique code to assign
)
returns uuid  -- returns new organization id
language plpgsql
security definer
as $$
declare
  v_req       public.org_requests%rowtype;
  v_auth_id   uuid;
  v_org_id    uuid;
begin
  -- Admin only
  if (select role from public.profiles where id = auth.uid()) != 'admin' then
    raise exception 'Access denied: admin only';
  end if;

  select * into v_req from public.org_requests where id = p_request_id;
  if not found then raise exception 'Request not found'; end if;

  -- Create organization record
  insert into public.organizations (name, unique_code, created_by)
  values (v_req.org_name, p_org_code, auth.uid())
  returning id into v_org_id;

  -- Mark request as approved
  update public.org_requests
  set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
  where id = p_request_id;

  return v_org_id;
end;
$$;

-- --------------------------------
-- Auto-set org user approved once org is created
-- (Org accounts are created by admin manually via dashboard)
-- --------------------------------
create or replace function public.reject_org_request(p_request_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  if (select role from public.profiles where id = auth.uid()) != 'admin' then
    raise exception 'Access denied';
  end if;

  update public.org_requests
  set status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now()
  where id = p_request_id;
end;
$$;

-- --------------------------------
-- Helper: generate a unique org code
-- --------------------------------
create or replace function public.generate_org_code(p_name text)
returns text
language plpgsql
as $$
declare
  v_code text;
  v_prefix text;
begin
  v_prefix := upper(regexp_replace(substring(p_name, 1, 4), '[^A-Za-z0-9]', '', 'g'));
  if length(v_prefix) < 2 then v_prefix := 'ORG'; end if;
  loop
    v_code := v_prefix || '-' || upper(substring(encode(gen_random_bytes(3), 'hex'), 1, 5));
    exit when not exists (select 1 from public.organizations where unique_code = v_code);
  end loop;
  return v_code;
end;
$$;
