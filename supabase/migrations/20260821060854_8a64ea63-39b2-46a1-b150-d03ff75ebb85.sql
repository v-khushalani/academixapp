CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role); $function$;

CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role::text = 'superadmin'); $function$;

CREATE OR REPLACE FUNCTION public.my_institute_ids()
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  WITH RECURSIVE mine AS (
    SELECT ur.institute_id AS id FROM public.user_roles ur
     WHERE ur.user_id = auth.uid() AND ur.institute_id IS NOT NULL
    UNION
    SELECT i.id FROM public.institutes i JOIN mine m ON i.parent_institute_id = m.id
  )
  SELECT id FROM mine;
$function$;

CREATE OR REPLACE FUNCTION public.current_institute_id()
RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare
  v_session_id text;
  v_user_id uuid := auth.uid();
begin
  begin
    v_session_id := current_setting('app.current_institute_id', true);
  exception when others then
    v_session_id := null;
  end;

  if v_session_id is not null and v_session_id <> '' then
    if exists (
      select 1 from public.user_roles
      where user_id = v_user_id and institute_id = v_session_id::uuid
    ) then
      return v_session_id::uuid;
    end if;
  end if;

  return (
    select institute_id from public.user_roles
    where user_id = v_user_id order by created_at desc limit 1
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.my_batch_ids()
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  select b.id from public.batches b where b.institute_id in (select public.my_institute_ids());
$function$;