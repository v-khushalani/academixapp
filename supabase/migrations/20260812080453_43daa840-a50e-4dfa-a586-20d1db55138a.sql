
-- 1. Hardened current_institute_id to support session-based branch switching
-- This function is used by RLS policies. It defaults to the first institute_id
-- but can be overridden by a session variable 'app.current_institute_id'.
create or replace function public.current_institute_id()
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_session_id text;
  v_user_id uuid := auth.uid();
begin
  -- Try session variable first (set by the application when switching branches)
  begin
    v_session_id := current_setting('app.current_institute_id', true);
  exception when others then
    v_session_id := null;
  end;
  
  if v_session_id is not null and v_session_id <> '' then
    -- Verify the user actually has a role in this institute
    if exists (
      select 1 from public.user_roles 
      where user_id = v_user_id 
      and institute_id = v_session_id::uuid
    ) then
      return v_session_id::uuid;
    end if;
  end if;

  -- Fallback to the first available institute_id for this user
  return (
    select institute_id
    from public.user_roles
    where user_id = v_user_id
    order by created_at desc
    limit 1
  );
end;
$$;

-- 2. Scoped has_any_role to the current context
create or replace function public.has_any_role(_user_id uuid, _roles public.app_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = any(_roles)
      and institute_id = public.current_institute_id()
  )
$$;

-- 3. Hardened UserRoles RLS
-- Users should only see roles within their current institute context
alter table public.user_roles enable row level security;
drop policy if exists "UserRoles: read own or admin all" on public.user_roles;
create policy "UserRoles isolation"
on public.user_roles
for select
to authenticated
using (
  (user_id = auth.uid()) -- Own roles
  OR 
  (
    institute_id = public.current_institute_id() -- Same institute
    AND 
    public.has_any_role(auth.uid(), array['owner'::app_role, 'admin'::app_role]) -- Only admins/owners see others
  )
  OR
  public.is_superadmin() -- Superadmins see all
);

-- 4. Hardened Profiles RLS
-- Profiles are global, but we only want users to see people they share an institute with
alter table public.profiles enable row level security;
drop policy if exists "Profiles: read own or staff can read all" on public.profiles;
create policy "Profiles isolation"
on public.profiles
for select
to authenticated
using (
  (id = auth.uid())
  OR
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = public.profiles.id
    and ur.institute_id = public.current_institute_id()
  )
  OR
  public.is_superadmin()
);

-- 5. Force RESTRICTIVE tenant isolation on all business tables
-- This ensures that even if other policies are loose, the institute_id MUST match.
do $$
declare
    t text;
begin
    for t in select table_name from information_schema.columns 
             where column_name = 'institute_id' 
             and table_schema = 'public'
             and table_name not in ('user_roles', 'profiles', 'institutes', 'audit_logs')
    loop
        execute format('alter table public.%I enable row level security', t);
        execute format('drop policy if exists "Tenant restrictive" on public.%I', t);
        execute format('create policy "Tenant restrictive" on public.%I as restrictive for all to authenticated using (institute_id = public.current_institute_id())', t);
    end loop;
end;
$$;

-- 6. Grant execute on functions
grant execute on function public.current_institute_id() to authenticated;
grant execute on function public.has_any_role(uuid, public.app_role[]) to authenticated;
