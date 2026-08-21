ALTER TABLE public.institutes DISABLE TRIGGER USER;

UPDATE public.institutes SET
  plan = 'free', status = 'active',
  student_limit = 100, batch_limit = 5, room_limit = 3,
  faculty_limit = 5, staff_login_limit = 2, teacher_login_limit = 5,
  tagline = 'Demo workspace for testing Academix',
  phone = '7066670222', email = 'admin@academix.website',
  address = 'Demo Campus, Nagpur',
  academic_year = to_char(now(),'YYYY') || '-' || to_char(now() + interval '1 year','YY'),
  upi_id = 'demo@upi', upi_name = 'Demo Academy'
WHERE slug LIKE 'demo-academy%';

ALTER TABLE public.institutes ENABLE TRIGGER USER;