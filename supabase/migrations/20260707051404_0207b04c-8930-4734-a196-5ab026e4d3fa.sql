
-- =========================================================
-- ENUMS
-- =========================================================
CREATE TYPE public.app_role AS ENUM (
  'owner','admin','faculty','receptionist','counsellor','accountant','student','parent'
);

CREATE TYPE public.batch_status AS ENUM ('active','upcoming','completed','cancelled');
CREATE TYPE public.student_status AS ENUM ('active','inactive','alumni','dropped');
CREATE TYPE public.lead_stage AS ENUM ('new','contacted','visit_scheduled','demo','negotiation','enrolled','lost');
CREATE TYPE public.attendance_status AS ENUM ('present','absent','late','excused');
CREATE TYPE public.fee_status AS ENUM ('pending','partial','paid','overdue','waived');
CREATE TYPE public.test_type AS ENUM ('quiz','unit','midterm','final','mock','practice');
CREATE TYPE public.test_status AS ENUM ('scheduled','ongoing','completed','cancelled');

-- =========================================================
-- SHARED updated_at trigger
-- =========================================================
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- =========================================================
-- PROFILES
-- =========================================================
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =========================================================
-- USER ROLES + has_role
-- =========================================================
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles public.app_role[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = ANY(_roles));
$$;

CREATE OR REPLACE FUNCTION public.get_my_roles()
RETURNS SETOF public.app_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.user_roles WHERE user_id = auth.uid();
$$;

-- Profiles RLS
CREATE POLICY "Profiles: read own or staff can read all" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_any_role(auth.uid(), ARRAY['owner','admin']::public.app_role[]));
CREATE POLICY "Profiles: update own" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "Profiles: admin update any" ON public.profiles FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['owner','admin']::public.app_role[]));
CREATE POLICY "Profiles: insert own" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- User roles RLS: anyone signed in can read (has_role uses definer, but keep read for UI)
CREATE POLICY "UserRoles: read own or admin all" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_any_role(auth.uid(), ARRAY['owner','admin']::public.app_role[]));
CREATE POLICY "UserRoles: admin manage" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['owner','admin']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['owner','admin']::public.app_role[]));

-- =========================================================
-- Auto-profile + first-user-becomes-owner trigger
-- =========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  is_first boolean;
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'phone'
  );

  SELECT NOT EXISTS (SELECT 1 FROM public.user_roles) INTO is_first;
  IF is_first THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'owner'), (NEW.id, 'admin');
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================
-- COURSES + SUBJECTS
-- =========================================================
CREATE TABLE public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.courses TO authenticated;
GRANT ALL ON public.courses TO service_role;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_courses_updated BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE POLICY "Courses read" ON public.courses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Courses admin write" ON public.courses FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['owner','admin']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['owner','admin']::public.app_role[]));

CREATE TABLE public.subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subjects TO authenticated;
GRANT ALL ON public.subjects TO service_role;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_subjects_updated BEFORE UPDATE ON public.subjects FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE POLICY "Subjects read" ON public.subjects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Subjects admin write" ON public.subjects FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['owner','admin']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['owner','admin']::public.app_role[]));

-- =========================================================
-- BATCHES
-- =========================================================
CREATE TABLE public.batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  faculty_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  start_date date,
  end_date date,
  capacity integer NOT NULL DEFAULT 30,
  schedule text,
  room text,
  status public.batch_status NOT NULL DEFAULT 'active',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.batches TO authenticated;
GRANT ALL ON public.batches TO service_role;
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_batches_updated BEFORE UPDATE ON public.batches FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX idx_batches_status ON public.batches(status);
CREATE INDEX idx_batches_faculty ON public.batches(faculty_id);
CREATE POLICY "Batches read" ON public.batches FOR SELECT TO authenticated USING (true);
CREATE POLICY "Batches admin write" ON public.batches FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['owner','admin']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['owner','admin']::public.app_role[]));

-- =========================================================
-- STUDENTS
-- =========================================================
CREATE TABLE public.students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admission_no text UNIQUE NOT NULL,
  full_name text NOT NULL,
  class text,
  batch_id uuid REFERENCES public.batches(id) ON DELETE SET NULL,
  school text,
  parent_name text,
  phone text,
  email text,
  address text,
  admission_date date NOT NULL DEFAULT CURRENT_DATE,
  status public.student_status NOT NULL DEFAULT 'active',
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.students TO authenticated;
GRANT ALL ON public.students TO service_role;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_students_updated BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX idx_students_batch ON public.students(batch_id);
CREATE INDEX idx_students_status ON public.students(status);
CREATE INDEX idx_students_name ON public.students(full_name);
CREATE POLICY "Students staff read" ON public.students FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['owner','admin','faculty','receptionist','counsellor','accountant']::public.app_role[])
         OR user_id = auth.uid());
CREATE POLICY "Students admin write" ON public.students FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['owner','admin','receptionist']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['owner','admin','receptionist']::public.app_role[]));

-- =========================================================
-- ADMISSIONS / LEADS
-- =========================================================
CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  phone text,
  email text,
  source text,
  course_interest text,
  stage public.lead_stage NOT NULL DEFAULT 'new',
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text,
  next_followup date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_leads_updated BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX idx_leads_stage ON public.leads(stage);
CREATE POLICY "Leads staff access" ON public.leads FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['owner','admin','receptionist','counsellor']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['owner','admin','receptionist','counsellor']::public.app_role[]));

-- =========================================================
-- ATTENDANCE
-- =========================================================
CREATE TABLE public.attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  batch_id uuid REFERENCES public.batches(id) ON DELETE SET NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  status public.attendance_status NOT NULL,
  marked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  remarks text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance TO authenticated;
GRANT ALL ON public.attendance TO service_role;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_attendance_updated BEFORE UPDATE ON public.attendance FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX idx_attendance_date ON public.attendance(date);
CREATE INDEX idx_attendance_batch_date ON public.attendance(batch_id, date);
CREATE POLICY "Attendance staff read" ON public.attendance FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['owner','admin','faculty','receptionist','counsellor']::public.app_role[])
         OR EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.user_id = auth.uid()));
CREATE POLICY "Attendance staff write" ON public.attendance FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['owner','admin','faculty']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['owner','admin','faculty']::public.app_role[]));

-- =========================================================
-- FEES
-- =========================================================
CREATE TABLE public.fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  batch_id uuid REFERENCES public.batches(id) ON DELETE SET NULL,
  amount numeric(12,2) NOT NULL,
  amount_paid numeric(12,2) NOT NULL DEFAULT 0,
  due_date date,
  paid_date date,
  method text,
  receipt_no text UNIQUE,
  status public.fee_status NOT NULL DEFAULT 'pending',
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fees TO authenticated;
GRANT ALL ON public.fees TO service_role;
ALTER TABLE public.fees ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_fees_updated BEFORE UPDATE ON public.fees FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX idx_fees_student ON public.fees(student_id);
CREATE INDEX idx_fees_status ON public.fees(status);
CREATE POLICY "Fees staff read" ON public.fees FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['owner','admin','accountant','receptionist']::public.app_role[])
         OR EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.user_id = auth.uid()));
CREATE POLICY "Fees accountant write" ON public.fees FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['owner','admin','accountant']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['owner','admin','accountant']::public.app_role[]));

-- =========================================================
-- TESTS + RESULTS
-- =========================================================
CREATE TABLE public.tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  type public.test_type NOT NULL DEFAULT 'quiz',
  subject text,
  batch_id uuid REFERENCES public.batches(id) ON DELETE SET NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  max_marks integer NOT NULL DEFAULT 100,
  status public.test_status NOT NULL DEFAULT 'scheduled',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tests TO authenticated;
GRANT ALL ON public.tests TO service_role;
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_tests_updated BEFORE UPDATE ON public.tests FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE POLICY "Tests read" ON public.tests FOR SELECT TO authenticated USING (true);
CREATE POLICY "Tests faculty write" ON public.tests FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['owner','admin','faculty']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['owner','admin','faculty']::public.app_role[]));

CREATE TABLE public.test_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  marks numeric(6,2),
  remarks text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (test_id, student_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.test_results TO authenticated;
GRANT ALL ON public.test_results TO service_role;
ALTER TABLE public.test_results ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_results_updated BEFORE UPDATE ON public.test_results FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX idx_results_test ON public.test_results(test_id);
CREATE POLICY "Results staff read" ON public.test_results FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['owner','admin','faculty','receptionist','counsellor']::public.app_role[])
         OR EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.user_id = auth.uid()));
CREATE POLICY "Results faculty write" ON public.test_results FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['owner','admin','faculty']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['owner','admin','faculty']::public.app_role[]));
