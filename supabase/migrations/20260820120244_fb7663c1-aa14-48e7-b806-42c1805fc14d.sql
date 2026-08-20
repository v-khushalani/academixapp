-- 1) Expenses: finance staff only ------------------------------------------
DROP POLICY IF EXISTS "Expenses isolation" ON public.expenses;
DROP POLICY IF EXISTS "Institutes can manage their own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Tenant isolation" ON public.expenses;
DROP POLICY IF EXISTS "Tenant restrictive" ON public.expenses;

CREATE POLICY "Finance staff manage expenses"
ON public.expenses FOR ALL TO authenticated
USING (
  public.is_superadmin()
  OR (
    institute_id = (SELECT public.current_institute_id())
    AND public.has_any_role((SELECT auth.uid()), ARRAY['owner','admin','accountant']::app_role[])
  )
)
WITH CHECK (
  public.is_superadmin()
  OR (
    institute_id = (SELECT public.current_institute_id())
    AND public.has_any_role((SELECT auth.uid()), ARRAY['owner','admin','accountant']::app_role[])
  )
);

-- 2) Student photos: scope to the owning institute --------------------------
CREATE OR REPLACE FUNCTION public.can_read_student_photo(_path text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_superadmin()
      OR EXISTS (
        SELECT 1
        FROM public.students s
        WHERE s.photo_path = _path
          AND s.institute_id IN (SELECT public.my_institute_ids())
      );
$$;

REVOKE ALL ON FUNCTION public.can_read_student_photo(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_read_student_photo(text) TO authenticated;

DROP POLICY IF EXISTS "staff can read student photos" ON storage.objects;
DROP POLICY IF EXISTS "Only staff or owner can read photos" ON storage.objects;
DROP POLICY IF EXISTS "staff can delete student photos" ON storage.objects;

CREATE POLICY "Institute staff read own student photos"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'student-photos'
  AND (
    (storage.foldername(name))[1] = ((SELECT auth.uid()))::text
    OR (
      public.has_any_role((SELECT auth.uid()), ARRAY['owner','admin','faculty','receptionist','counsellor','accountant']::app_role[])
      AND public.can_read_student_photo(name)
    )
  )
);

CREATE POLICY "Institute staff delete own student photos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'student-photos'
  AND public.has_any_role((SELECT auth.uid()), ARRAY['owner','admin','receptionist']::app_role[])
  AND public.can_read_student_photo(name)
);

-- 3) Institutes: owners/admins cannot self-upgrade plan or limits -----------
CREATE OR REPLACE FUNCTION public.lock_institute_billing_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_superadmin() THEN
    RETURN NEW;
  END IF;

  IF NEW.plan IS DISTINCT FROM OLD.plan
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.student_limit IS DISTINCT FROM OLD.student_limit
     OR NEW.batch_limit IS DISTINCT FROM OLD.batch_limit
     OR NEW.faculty_limit IS DISTINCT FROM OLD.faculty_limit
     OR NEW.room_limit IS DISTINCT FROM OLD.room_limit
     OR NEW.staff_login_limit IS DISTINCT FROM OLD.staff_login_limit
     OR NEW.teacher_login_limit IS DISTINCT FROM OLD.teacher_login_limit
     OR NEW.features IS DISTINCT FROM OLD.features
     OR NEW.parent_institute_id IS DISTINCT FROM OLD.parent_institute_id
  THEN
    RAISE EXCEPTION 'Plan, limits and features can only be changed by the Academix team'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS lock_institute_billing_columns ON public.institutes;
CREATE TRIGGER lock_institute_billing_columns
BEFORE UPDATE ON public.institutes
FOR EACH ROW EXECUTE FUNCTION public.lock_institute_billing_columns();

-- 4) Remove the stale duplicate platform function ---------------------------
DROP FUNCTION IF EXISTS public.platform_update_institute(uuid, text, text, integer, integer, integer, integer, integer, integer, jsonb, jsonb, uuid, boolean);
