CREATE OR REPLACE FUNCTION public.check_plan_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  v_limit int;
  v_usage jsonb;
  v_inst_id uuid;
  v_role text;
  v_staff_roles text[] := array['owner','admin','receptionist','counsellor','accountant'];
begin
  v_inst_id := coalesce(new.institute_id, current_institute_id());
  if v_inst_id is null then return new; end if;

  if TG_TABLE_NAME = 'user_roles' then
    v_role := new.role::text;
    select case
             when v_role = any(v_staff_roles) then p.staff_login_limit
             when v_role = 'faculty' then p.teacher_login_limit
             else 0
           end
      into v_limit
      from public.institutes i
      join public.plan_catalog p on i.plan = p.key
     where i.id = v_inst_id;
  else
    select case
             when TG_TABLE_NAME = 'students' then p.student_limit
             when TG_TABLE_NAME = 'batches' then p.batch_limit
             when TG_TABLE_NAME = 'rooms' then p.room_limit
             else 0
           end
      into v_limit
      from public.institutes i
      join public.plan_catalog p on i.plan = p.key
     where i.id = v_inst_id;
  end if;

  -- no catalog row, or 0 = unlimited
  if v_limit is null or v_limit = 0 then return new; end if;

  v_usage := get_institute_usage(v_inst_id);

  if TG_TABLE_NAME = 'students' and (v_usage->>'students')::int >= v_limit then
    raise exception 'Student limit reached (%/%)', v_usage->>'students', v_limit;
  elsif TG_TABLE_NAME = 'batches' and (v_usage->>'batches')::int >= v_limit then
    raise exception 'Batch limit reached (%/%)', v_usage->>'batches', v_limit;
  elsif TG_TABLE_NAME = 'rooms' and (v_usage->>'rooms')::int >= v_limit then
    raise exception 'Room limit reached (%/%)', v_usage->>'rooms', v_limit;
  elsif TG_TABLE_NAME = 'user_roles' then
    if v_role = any(v_staff_roles) and (v_usage->>'staffLogins')::int >= v_limit then
      raise exception 'Office login limit reached (%/%)', v_usage->>'staffLogins', v_limit;
    elsif v_role = 'faculty' and (v_usage->>'teacherLogins')::int >= v_limit then
      raise exception 'Teacher login limit reached (%/%)', v_usage->>'teacherLogins', v_limit;
    end if;
  end if;

  return new;
end;
$$;