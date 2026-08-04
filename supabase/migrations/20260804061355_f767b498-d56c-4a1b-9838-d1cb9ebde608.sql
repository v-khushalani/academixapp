ALTER TABLE public.user_roles ALTER COLUMN institute_id DROP NOT NULL;

DO $$
DECLARE keep uuid;
BEGIN
  SELECT id INTO keep FROM auth.users WHERE email = 'vk0001@gmail.com';

  DELETE FROM public.syllabus_logs;
  DELETE FROM public.syllabus_chapters;
  DELETE FROM public.test_results;
  DELETE FROM public.tests;
  DELETE FROM public.attendance;
  DELETE FROM public.notification_logs;
  DELETE FROM public.student_activities;
  DELETE FROM public.student_documents;
  DELETE FROM public.homework;
  DELETE FROM public.parent_students;
  DELETE FROM public.fees;
  DELETE FROM public.timetable_slots;
  DELETE FROM public.timetable_day_plan;
  DELETE FROM public.automation_rules;
  DELETE FROM public.leads;
  DELETE FROM public.students;
  DELETE FROM public.batches;
  DELETE FROM public.subjects;
  DELETE FROM public.courses;
  DELETE FROM public.rooms;
  DELETE FROM public.faculty_invites;
  DELETE FROM public.faculty;
  DELETE FROM public.user_roles;
  DELETE FROM public.profiles;
  DELETE FROM public.institutes;

  DELETE FROM auth.users WHERE id IS DISTINCT FROM keep;

  IF keep IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (keep, 'superadmin')
      ON CONFLICT DO NOTHING;
  END IF;
END $$;