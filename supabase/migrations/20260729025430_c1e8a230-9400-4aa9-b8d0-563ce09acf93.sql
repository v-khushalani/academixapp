DO $$
DECLARE demo_user uuid; target uuid; r record;
BEGIN
  SELECT id INTO demo_user FROM auth.users WHERE email = 'demo.student@academix.app';
  IF demo_user IS NOT NULL THEN
    UPDATE public.students SET user_id = NULL WHERE user_id = demo_user;
    SELECT s.id INTO target
      FROM public.students s
      JOIN public.fees f ON f.student_id = s.id
     WHERE s.approval_status = 'approved' AND s.status = 'active' AND s.batch_id IS NOT NULL
     ORDER BY s.created_at LIMIT 1;
    IF target IS NOT NULL THEN
      UPDATE public.students SET user_id = demo_user WHERE id = target;
    END IF;
  END IF;

  FOR r IN SELECT id FROM public.students
            WHERE approval_status = 'approved' AND status = 'active' AND batch_id IS NOT NULL
  LOOP
    PERFORM public.sync_student_batch_fee(r.id);
  END LOOP;
END $$;