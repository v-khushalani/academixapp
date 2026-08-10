
-- Enforce student limit based on plan
create or replace function public.check_plan_limits()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit int;
  v_count int;
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
        case when new.role = any(v_staff_roles) then p.staff_login_limit else 999999 end
      else 999999
    end into v_limit
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
