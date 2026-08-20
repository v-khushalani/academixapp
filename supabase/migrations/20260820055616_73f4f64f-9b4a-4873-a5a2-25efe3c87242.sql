-- Re-apply RLS to all core tables to ensure they use the new functions
-- Profiles
alter table public.profiles enable row level security;
drop policy if exists "Profiles: read own or staff can read all" on public.profiles;
create policy "Profiles: read own or staff can read all"
on public.profiles
for select
to authenticated
using (
  (id = auth.uid()) 
  OR 
  public.has_any_role(auth.uid(), array['owner'::app_role, 'admin'::app_role])
);

-- User Roles
alter table public.user_roles enable row level security;
drop policy if exists "UserRoles: read own or admin all" on public.user_roles;
create policy "UserRoles: read own or admin all"
on public.user_roles
for select
to authenticated
using (
  (user_id = auth.uid()) 
  OR 
  public.has_any_role(auth.uid(), array['owner'::app_role, 'admin'::app_role])
);

-- Students
alter table public.students enable row level security;
drop policy if exists "Students staff read" on public.students;
create policy "Students staff read"
on public.students
for select
to authenticated
using (
  public.has_any_role(auth.uid(), array['owner'::app_role, 'admin'::app_role, 'faculty'::app_role, 'receptionist'::app_role, 'counsellor'::app_role, 'accountant'::app_role])
  OR (user_id = auth.uid())
);

-- Batches
alter table public.batches enable row level security;
drop policy if exists "Batches isolation" on public.batches;
create policy "Batches isolation"
on public.batches
for all
to authenticated
using (institute_id = public.current_institute_id());

-- Fees
alter table public.fees enable row level security;
drop policy if exists "Fees: own read" on public.fees;
create policy "Fees: own read"
on public.fees
for select
to authenticated
using (
  public.is_my_student(student_id)
  OR 
  public.has_any_role(auth.uid(), array['owner'::app_role, 'admin'::app_role, 'accountant'::app_role, 'receptionist'::app_role])
);

-- Expenses
alter table public.expenses enable row level security;
drop policy if exists "Expenses isolation" on public.expenses;
create policy "Expenses isolation"
on public.expenses
for all
to authenticated
using (institute_id = public.current_institute_id());

-- Security Definer fix for has_any_role
create or replace function public.has_any_role(_user_id uuid, _roles app_role[])
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
  )
$$;

grant execute on function public.has_any_role(uuid, app_role[]) to authenticated;
grant execute on function public.has_any_role(uuid, app_role[]) to service_role;
