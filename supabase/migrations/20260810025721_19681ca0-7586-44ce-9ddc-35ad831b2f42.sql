
-- 1. Helper function for usage calculation (avoids duplicate logic in triggers and API)
create or replace function public.get_institute_usage(_institute_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inst_id uuid;
  v_res jsonb;
begin
  v_inst_id := coalesce(_institute_id, current_institute_id());
  if v_inst_id is null then return null; end if;

  with counts as (
    select 
      (select count(*) from public.students where institute_id = v_inst_id and status = 'active') as students,
      (select count(*) from public.rooms where institute_id = v_inst_id) as rooms,
      (select count(*) from public.batches where institute_id = v_inst_id and status = 'active') as batches,
      (select count(*) from public.faculty where institute_id = v_inst_id) as faculty,
      (select count(*) from public.user_roles where institute_id = v_inst_id and role in ('owner', 'admin', 'receptionist', 'counsellor', 'accountant')) as staff,
      (select count(*) from public.user_roles where institute_id = v_inst_id and role = 'faculty') as teachers
  )
  select jsonb_build_object(
    'students', students,
    'rooms', rooms,
    'batches', batches,
    'faculty', faculty,
    'staffLogins', staff,
    'teacherLogins', teachers
  ) into v_res from counts;

  return v_res;
end;
$$;

-- 2. Improved Plan Limits Trigger using the helper
create or replace function public.check_plan_limits()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit int;
  v_usage jsonb;
  v_inst_id uuid;
  v_staff_roles public.app_role[] := array['owner', 'admin', 'receptionist', 'counsellor', 'accountant']::public.app_role[];
begin
  v_inst_id := coalesce(new.institute_id, current_institute_id());
  if v_inst_id is null then return new; end if;
  
  -- Get plan limits
  select 
    case 
      when TG_TABLE_NAME = 'students' then p.student_limit
      when TG_TABLE_NAME = 'batches' then p.batch_limit
      when TG_TABLE_NAME = 'rooms' then p.room_limit
      when TG_TABLE_NAME = 'user_roles' then 
        case 
          when new.role = any(v_staff_roles) then p.staff_login_limit 
          when new.role = 'faculty' then p.teacher_login_limit
          else 999999 
        end
      else 999999
    end into v_limit
  from public.institutes i
  join public.plan_catalog p on i.plan = p.key
  where i.id = v_inst_id;

  -- 0 in plan_catalog means unlimited
  if v_limit = 0 then return new; end if;

  -- Get current usage
  v_usage := get_institute_usage(v_inst_id);

  if TG_TABLE_NAME = 'students' and (v_usage->>'students')::int >= v_limit then
    raise exception 'Student limit reached (%/%)', v_usage->>'students', v_limit;
  elsif TG_TABLE_NAME = 'batches' and (v_usage->>'batches')::int >= v_limit then
    raise exception 'Batch limit reached (%/%)', v_usage->>'batches', v_limit;
  elsif TG_TABLE_NAME = 'rooms' and (v_usage->>'rooms')::int >= v_limit then
    raise exception 'Room limit reached (%/%)', v_usage->>'rooms', v_limit;
  elsif TG_TABLE_NAME = 'user_roles' then
    if new.role = any(v_staff_roles) and (v_usage->>'staffLogins')::int >= v_limit then
       raise exception 'Office login limit reached (%/%)', v_usage->>'staffLogins', v_limit;
    elsif new.role = 'faculty' and (v_usage->>'teacherLogins')::int >= v_limit then
       raise exception 'Teacher login limit reached (%/%)', v_usage->>'teacherLogins', v_limit;
    end if;
  end if;

  return new;
end;
$$;
