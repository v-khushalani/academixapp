-- 1) Clean up junk / duplicate fee rows -------------------------------------
-- merge duplicate non-batch fee rows per student (keep oldest, sum payments)
WITH dupes AS (
  SELECT student_id,
         MIN(id::text)::uuid AS keep_id,
         SUM(COALESCE(amount_paid,0)) AS total_paid
  FROM public.fees
  WHERE batch_id IS NULL AND amount > 0
  GROUP BY student_id
  HAVING COUNT(*) > 1
)
UPDATE public.fees f
   SET amount_paid = d.total_paid,
       status = CASE WHEN d.total_paid >= f.amount THEN 'paid'::fee_status
                     WHEN d.total_paid > 0 THEN 'partial'::fee_status
                     ELSE 'pending'::fee_status END
  FROM dupes d
 WHERE f.id = d.keep_id;

DELETE FROM public.fees f
 USING (
  SELECT student_id, MIN(id::text)::uuid AS keep_id
    FROM public.fees
   WHERE batch_id IS NULL AND amount > 0
   GROUP BY student_id
   HAVING COUNT(*) > 1
 ) d
 WHERE f.student_id = d.student_id
   AND f.batch_id IS NULL
   AND f.amount > 0
   AND f.id <> d.keep_id;

-- drop zero-amount rows left behind by the old "token payment" flow
DELETE FROM public.fees WHERE COALESCE(amount,0) <= 0;

ALTER TABLE public.fees
  ADD CONSTRAINT fees_amount_positive CHECK (amount > 0) NOT VALID;

-- 2) Demo accounts ----------------------------------------------------------
DO $$
DECLARE
  inst uuid := '4ca4e0de-aff8-47c2-ad54-855cea5a4571';
  admin_id uuid := gen_random_uuid();
  teacher_id uuid := gen_random_uuid();
  student_id uuid := gen_random_uuid();
  demo_student uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = 'demo.admin@academix.app') THEN
    RETURN;
  END IF;

  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password,
                          email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
                          created_at, updated_at)
  VALUES
    ('00000000-0000-0000-0000-000000000000', admin_id, 'authenticated', 'authenticated',
     'demo.admin@academix.app', crypt('Demo@12345', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}', '{"full_name":"Demo Admin"}', now(), now()),
    ('00000000-0000-0000-0000-000000000000', teacher_id, 'authenticated', 'authenticated',
     'demo.teacher@academix.app', crypt('Demo@12345', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}', '{"full_name":"Demo Teacher"}', now(), now()),
    ('00000000-0000-0000-0000-000000000000', student_id, 'authenticated', 'authenticated',
     'demo.student@academix.app', crypt('Demo@12345', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}', '{"full_name":"Demo Student"}', now(), now());

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES
    (gen_random_uuid(), admin_id, admin_id::text,
     json_build_object('sub', admin_id::text, 'email', 'demo.admin@academix.app', 'email_verified', true)::jsonb,
     'email', now(), now(), now()),
    (gen_random_uuid(), teacher_id, teacher_id::text,
     json_build_object('sub', teacher_id::text, 'email', 'demo.teacher@academix.app', 'email_verified', true)::jsonb,
     'email', now(), now(), now()),
    (gen_random_uuid(), student_id, student_id::text,
     json_build_object('sub', student_id::text, 'email', 'demo.student@academix.app', 'email_verified', true)::jsonb,
     'email', now(), now(), now());

  INSERT INTO public.user_roles (user_id, role, institute_id) VALUES
    (admin_id, 'admin', inst),
    (teacher_id, 'faculty', inst),
    (student_id, 'student', inst)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.faculty (user_id, full_name, email, phone, subject, status, institute_id)
  VALUES (teacher_id, 'Demo Teacher', 'demo.teacher@academix.app', '9000000002', 'Mathematics', 'active', inst);

  SELECT id INTO demo_student FROM public.students
   WHERE institute_id = inst AND approval_status = 'approved' AND user_id IS NULL
   ORDER BY created_at LIMIT 1;
  IF demo_student IS NOT NULL THEN
    UPDATE public.students SET user_id = student_id WHERE id = demo_student;
  END IF;
END $$;