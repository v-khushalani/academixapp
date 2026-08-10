
-- 1. Hardened Tenant Isolation
create or replace function public.current_institute_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select institute_id
  from public.user_roles
  where user_id = auth.uid()
  limit 1;
$$;

-- 2. Secure Storage Policies (student-photos)
drop policy if exists "applicants can upload their photo" on storage.objects;
drop policy if exists "Applicants can upload with token path" on storage.objects;

create policy "Applicants can upload with token path"
on storage.objects for insert
to anon, authenticated
with check (
  bucket_id = 'student-photos' AND
  (
    (auth.role() = 'authenticated') OR
    (storage.foldername(name))[1] = 'submissions'
  )
);

drop policy if exists "Only staff or owner can read photos" on storage.objects;
create policy "Only staff or owner can read photos"
on storage.objects for select
to authenticated
using (
  bucket_id = 'student-photos' AND
  (
    -- Check for institute-level staff roles
    exists (
      select 1 from public.user_roles 
      where user_id = auth.uid() 
      and role in ('owner', 'admin', 'faculty', 'receptionist', 'counsellor', 'accountant')
    ) OR
    (storage.foldername(name))[1] = auth.uid()::text
  )
);

-- 3. Plan Enforcement Trigger
create or replace function public.check_plan_limits()
returns trigger
language plpgsql
security definer
as $$
declare
  v_limit int;
  v_count int;
  v_inst_id uuid;
  v_plan_key text;
  v_staff_roles public.app_role[] := array['owner', 'admin', 'receptionist', 'counsellor', 'accountant']::public.app_role[];
begin
  v_inst_id := coalesce(new.institute_id, current_institute_id());
  if v_inst_id is null then return new; end if;
  
  -- Get plan limits
  select p.key, 
    case 
      when TG_TABLE_NAME = 'students' then p.student_limit
      when TG_TABLE_NAME = 'batches' then p.batch_limit
      when TG_TABLE_NAME = 'rooms' then p.room_limit
      when TG_TABLE_NAME = 'user_roles' then 
        case when new.role = any(v_staff_roles) then p.staff_login_limit else 999999 end
      else 999999
    end into v_plan_key, v_limit
  from public.institutes i
  join public.plan_catalog p on i.plan = p.key
  where i.id = v_inst_id;

  -- Count current
  if TG_TABLE_NAME = 'students' then
    select count(*) into v_count from public.students where institute_id = v_inst_id and status = 'active';
  elsif TG_TABLE_NAME = 'batches' then
    select count(*) into v_count from public.batches where institute_id = v_inst_id and status = 'active';
  elsif TG_TABLE_NAME = 'rooms' then
    select count(*) into v_count from public.rooms where institute_id = v_inst_id;
  elsif TG_TABLE_NAME = 'user_roles' then
    select count(*) into v_count 
    from public.user_roles 
    where institute_id = v_inst_id and role = any(v_staff_roles);
  end if;

  if v_limit is not null and v_count >= v_limit then
    raise exception 'Plan limit exceeded for %. Current: %, Limit: %. Please upgrade your plan.', TG_TABLE_NAME, v_count, v_limit;
  end if;

  return new;
end;
$$;

drop trigger if exists tr_limit_students on public.students;
create trigger tr_limit_students before insert on public.students
for each row execute function public.check_plan_limits();

drop trigger if exists tr_limit_batches on public.batches;
create trigger tr_limit_batches before insert on public.batches
for each row execute function public.check_plan_limits();

drop trigger if exists tr_limit_rooms on public.rooms;
create trigger tr_limit_rooms before insert on public.rooms
for each row execute function public.check_plan_limits();

drop trigger if exists tr_limit_staff on public.user_roles;
create trigger tr_limit_staff before insert on public.user_roles
for each row when (new.role in ('owner', 'admin', 'receptionist', 'counsellor', 'accountant'))
execute function public.check_plan_limits();
