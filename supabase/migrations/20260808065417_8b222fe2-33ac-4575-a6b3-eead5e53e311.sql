-- 1. Tenant scope ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.current_institute_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT ur.institute_id FROM public.user_roles ur
   WHERE ur.user_id = auth.uid() AND ur.institute_id IS NOT NULL
   ORDER BY ur.created_at LIMIT 1;
$$;

ALTER TABLE public.institutes
  ADD COLUMN IF NOT EXISTS parent_institute_id uuid REFERENCES public.institutes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS student_limit integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS batch_limit integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS faculty_limit integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS staff_login_limit integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS teacher_login_limit integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS features jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS institutes_parent_idx ON public.institutes(parent_institute_id);

-- every institute the signed-in user belongs to, plus its branches
CREATE OR REPLACE FUNCTION public.my_institute_ids()
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  WITH RECURSIVE mine AS (
    SELECT ur.institute_id AS id FROM public.user_roles ur
     WHERE ur.user_id = auth.uid() AND ur.institute_id IS NOT NULL
    UNION
    SELECT i.id FROM public.institutes i JOIN mine m ON i.parent_institute_id = m.id
  )
  SELECT id FROM mine;
$$;

GRANT EXECUTE ON FUNCTION public.my_institute_ids() TO authenticated;

-- 2. Re-point every institute-scoped policy at my_institute_ids() -------------

DO $$
DECLARE p record; q text; w text; stmt text;
BEGIN
  FOR p IN
    SELECT c.relname AS tbl, pol.polname AS name, pol.polcmd AS cmd, pol.polpermissive AS perm,
           pg_get_expr(pol.polqual, pol.polrelid) AS qual,
           pg_get_expr(pol.polwithcheck, pol.polrelid) AS wc,
           (SELECT string_agg(quote_ident(r.rolname), ', ') FROM pg_roles r WHERE r.oid = ANY(pol.polroles)) AS roles
      FROM pg_policy pol
      JOIN pg_class c ON c.oid = pol.polrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND (coalesce(pg_get_expr(pol.polqual, pol.polrelid),'') ||
            coalesce(pg_get_expr(pol.polwithcheck, pol.polrelid),'')) LIKE '%current_institute_id()%'
  LOOP
    q := p.qual; w := p.wc;
    FOREACH stmt IN ARRAY ARRAY['x'] LOOP END LOOP; -- noop keeps plpgsql happy

    q := replace(coalesce(q,''), '(NOT (institute_id IS DISTINCT FROM current_institute_id()))', '(institute_id IN (SELECT public.my_institute_ids()))');
    q := replace(q, '(institute_id = current_institute_id())', '(institute_id IN (SELECT public.my_institute_ids()))');
    q := replace(q, 'institute_id = current_institute_id()', 'institute_id IN (SELECT public.my_institute_ids())');
    q := replace(q, '(id = current_institute_id())', '(id IN (SELECT public.my_institute_ids()))');
    q := replace(q, 'id = current_institute_id()', 'id IN (SELECT public.my_institute_ids())');
    IF q = '' THEN q := NULL; END IF;

    w := replace(coalesce(w,''), '(NOT (institute_id IS DISTINCT FROM current_institute_id()))', '(institute_id IN (SELECT public.my_institute_ids()))');
    w := replace(w, '(institute_id = current_institute_id())', '(institute_id IN (SELECT public.my_institute_ids()))');
    w := replace(w, 'institute_id = current_institute_id()', 'institute_id IN (SELECT public.my_institute_ids())');
    w := replace(w, '(id = current_institute_id())', '(id IN (SELECT public.my_institute_ids()))');
    w := replace(w, 'id = current_institute_id()', 'id IN (SELECT public.my_institute_ids())');
    IF w = '' THEN w := NULL; END IF;

    EXECUTE format('DROP POLICY %I ON public.%I', p.name, p.tbl);

    stmt := format('CREATE POLICY %I ON public.%I AS %s FOR %s TO %s',
      p.name, p.tbl,
      CASE WHEN p.perm THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END,
      CASE p.cmd WHEN 'r' THEN 'SELECT' WHEN 'a' THEN 'INSERT' WHEN 'w' THEN 'UPDATE' WHEN 'd' THEN 'DELETE' ELSE 'ALL' END,
      coalesce(p.roles, 'public'));
    IF q IS NOT NULL THEN stmt := stmt || format(' USING (%s)', q); END IF;
    IF w IS NOT NULL THEN stmt := stmt || format(' WITH CHECK (%s)', w); END IF;
    EXECUTE stmt;
  END LOOP;
END $$;

-- 3. Seed per-institute limits from the plan the institute is on --------------

UPDATE public.institutes i SET
  student_limit       = COALESCE(NULLIF(i.student_limit,0), pc.student_limit, 0),
  room_limit          = COALESCE(NULLIF(i.room_limit,0), pc.room_limit, 0),
  batch_limit         = COALESCE(NULLIF(i.batch_limit,0), pc.batch_limit, 0),
  staff_login_limit   = COALESCE(NULLIF(i.staff_login_limit,0), pc.staff_login_limit, 0),
  teacher_login_limit = COALESCE(NULLIF(i.teacher_login_limit,0), pc.teacher_login_limit, 0),
  faculty_limit       = COALESCE(NULLIF(i.faculty_limit,0), pc.teacher_login_limit, 0)
FROM public.plan_catalog pc
WHERE pc.key = i.plan;

-- 4. Server-side limit enforcement --------------------------------------------

CREATE OR REPLACE FUNCTION public.enforce_institute_limits()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE lim integer; used integer; inst uuid; label text;
BEGIN
  IF TG_TABLE_NAME = 'user_roles' THEN
    inst := NEW.institute_id;
    IF inst IS NULL THEN RETURN NEW; END IF;
    IF NEW.role::text IN ('student','parent','superadmin') THEN RETURN NEW; END IF;
    IF NEW.role::text = 'faculty' THEN
      SELECT teacher_login_limit INTO lim FROM public.institutes WHERE id = inst;
      SELECT count(DISTINCT user_id) INTO used FROM public.user_roles
        WHERE institute_id = inst AND role::text = 'faculty' AND user_id <> NEW.user_id;
      label := 'teacher logins';
    ELSE
      SELECT staff_login_limit INTO lim FROM public.institutes WHERE id = inst;
      SELECT count(DISTINCT user_id) INTO used FROM public.user_roles
        WHERE institute_id = inst
          AND role::text IN ('owner','admin','receptionist','counsellor','accountant')
          AND user_id <> NEW.user_id;
      label := 'office logins';
    END IF;
  ELSE
    inst := NEW.institute_id;
    IF inst IS NULL THEN RETURN NEW; END IF;
    IF TG_TABLE_NAME = 'students' THEN
      IF COALESCE(NEW.approval_status,'pending') <> 'approved' THEN RETURN NEW; END IF;
      SELECT student_limit INTO lim FROM public.institutes WHERE id = inst;
      SELECT count(*) INTO used FROM public.students
        WHERE institute_id = inst AND approval_status = 'approved' AND id <> NEW.id;
      label := 'students';
    ELSIF TG_TABLE_NAME = 'batches' THEN
      SELECT batch_limit INTO lim FROM public.institutes WHERE id = inst;
      SELECT count(*) INTO used FROM public.batches WHERE institute_id = inst AND id <> NEW.id;
      label := 'batches';
    ELSIF TG_TABLE_NAME = 'rooms' THEN
      SELECT room_limit INTO lim FROM public.institutes WHERE id = inst;
      SELECT count(*) INTO used FROM public.rooms WHERE institute_id = inst AND id <> NEW.id;
      label := 'classrooms';
    ELSIF TG_TABLE_NAME = 'faculty' THEN
      SELECT faculty_limit INTO lim FROM public.institutes WHERE id = inst;
      SELECT count(*) INTO used FROM public.faculty WHERE institute_id = inst AND id <> NEW.id;
      label := 'faculty members';
    ELSE
      RETURN NEW;
    END IF;
  END IF;

  IF COALESCE(lim,0) > 0 AND used >= lim THEN
    RAISE EXCEPTION 'Your plan allows % % . Call Academix on 70666 70222 to raise this limit.', lim, label
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_limit_students ON public.students;
CREATE TRIGGER trg_limit_students BEFORE INSERT OR UPDATE OF approval_status ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.enforce_institute_limits();

DROP TRIGGER IF EXISTS trg_limit_batches ON public.batches;
CREATE TRIGGER trg_limit_batches BEFORE INSERT ON public.batches
  FOR EACH ROW EXECUTE FUNCTION public.enforce_institute_limits();

DROP TRIGGER IF EXISTS trg_limit_rooms ON public.rooms;
CREATE TRIGGER trg_limit_rooms BEFORE INSERT ON public.rooms
  FOR EACH ROW EXECUTE FUNCTION public.enforce_institute_limits();

DROP TRIGGER IF EXISTS trg_limit_faculty ON public.faculty;
CREATE TRIGGER trg_limit_faculty BEFORE INSERT ON public.faculty
  FOR EACH ROW EXECUTE FUNCTION public.enforce_institute_limits();

DROP TRIGGER IF EXISTS trg_limit_logins ON public.user_roles;
CREATE TRIGGER trg_limit_logins BEFORE INSERT ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_institute_limits();

-- 5. Superadmin console read helper -------------------------------------------

CREATE OR REPLACE FUNCTION public.platform_institutes()
RETURNS TABLE(
  id uuid, name text, slug text, plan text, status text, parent_institute_id uuid,
  student_limit integer, room_limit integer, batch_limit integer, faculty_limit integer,
  staff_login_limit integer, teacher_login_limit integer, features jsonb,
  installment_plan jsonb,
  students bigint, batches bigint, rooms bigint, faculty bigint,
  staff_logins bigint, teacher_logins bigint
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT i.id, i.name, i.slug, i.plan, i.status, i.parent_institute_id,
         i.student_limit, i.room_limit, i.batch_limit, i.faculty_limit,
         i.staff_login_limit, i.teacher_login_limit, i.features, i.installment_plan,
         (SELECT count(*) FROM public.students s WHERE s.institute_id = i.id AND s.approval_status = 'approved'),
         (SELECT count(*) FROM public.batches b WHERE b.institute_id = i.id),
         (SELECT count(*) FROM public.rooms r WHERE r.institute_id = i.id),
         (SELECT count(*) FROM public.faculty f WHERE f.institute_id = i.id),
         (SELECT count(DISTINCT ur.user_id) FROM public.user_roles ur WHERE ur.institute_id = i.id AND ur.role::text IN ('owner','admin','receptionist','counsellor','accountant')),
         (SELECT count(DISTINCT ur.user_id) FROM public.user_roles ur WHERE ur.institute_id = i.id AND ur.role::text = 'faculty')
  FROM public.institutes i
  WHERE public.is_superadmin()
  ORDER BY i.name;
$$;

REVOKE EXECUTE ON FUNCTION public.platform_institutes() FROM anon;
GRANT EXECUTE ON FUNCTION public.platform_institutes() TO authenticated;

CREATE OR REPLACE FUNCTION public.platform_update_institute(
  _id uuid, _plan text DEFAULT NULL, _status text DEFAULT NULL,
  _student_limit integer DEFAULT NULL, _room_limit integer DEFAULT NULL,
  _batch_limit integer DEFAULT NULL, _faculty_limit integer DEFAULT NULL,
  _staff_login_limit integer DEFAULT NULL, _teacher_login_limit integer DEFAULT NULL,
  _features jsonb DEFAULT NULL, _installment_plan jsonb DEFAULT NULL,
  _parent_institute_id uuid DEFAULT NULL, _clear_parent boolean DEFAULT false
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.is_superadmin() THEN RAISE EXCEPTION 'Not authorised'; END IF;
  UPDATE public.institutes SET
    plan = COALESCE(_plan, plan),
    status = COALESCE(_status, status),
    student_limit = COALESCE(_student_limit, student_limit),
    room_limit = COALESCE(_room_limit, room_limit),
    batch_limit = COALESCE(_batch_limit, batch_limit),
    faculty_limit = COALESCE(_faculty_limit, faculty_limit),
    staff_login_limit = COALESCE(_staff_login_limit, staff_login_limit),
    teacher_login_limit = COALESCE(_teacher_login_limit, teacher_login_limit),
    features = COALESCE(_features, features),
    installment_plan = COALESCE(_installment_plan, installment_plan),
    parent_institute_id = CASE WHEN _clear_parent THEN NULL ELSE COALESCE(_parent_institute_id, parent_institute_id) END,
    updated_at = now()
  WHERE id = _id;
END $$;

REVOKE EXECUTE ON FUNCTION public.platform_update_institute(uuid,text,text,integer,integer,integer,integer,integer,integer,jsonb,jsonb,uuid,boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.platform_update_institute(uuid,text,text,integer,integer,integer,integer,integer,integer,jsonb,jsonb,uuid,boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.platform_institute_detail(_institute_id uuid)
RETURNS TABLE(kind text, id uuid, title text, subtitle text, extra text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT 'batch', b.id, b.name, COALESCE(b.class_level,''), b.status::text
    FROM public.batches b WHERE public.is_superadmin() AND b.institute_id = _institute_id
  UNION ALL
  SELECT 'student', s.id, s.full_name, COALESCE(s.class,''), s.approval_status
    FROM public.students s WHERE public.is_superadmin() AND s.institute_id = _institute_id
  ORDER BY 1, 3;
$$;

REVOKE EXECUTE ON FUNCTION public.platform_institute_detail(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.platform_institute_detail(uuid) TO authenticated;