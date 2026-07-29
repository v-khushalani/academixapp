DO $$
DECLARE demo_user uuid; inst uuid; target uuid;
BEGIN
  SELECT id INTO demo_user FROM auth.users WHERE email = 'demo.student@academix.app';
  SELECT institute_id INTO inst FROM public.user_roles WHERE user_id = demo_user AND institute_id IS NOT NULL LIMIT 1;
  UPDATE public.students SET user_id = NULL WHERE user_id = demo_user;
  SELECT s.id INTO target FROM public.students s
    JOIN public.fees f ON f.student_id = s.id
   WHERE s.institute_id = inst AND s.approval_status='approved' AND s.status='active' AND s.batch_id IS NOT NULL
   ORDER BY s.created_at LIMIT 1;
  IF target IS NOT NULL THEN
    UPDATE public.students SET user_id = demo_user WHERE id = target;
  END IF;
END $$;