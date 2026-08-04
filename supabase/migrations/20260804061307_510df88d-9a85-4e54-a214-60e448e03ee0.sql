CREATE TABLE public.plan_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  tagline text NOT NULL DEFAULT '',
  price_yearly integer,
  student_limit integer NOT NULL DEFAULT 100,
  room_limit integer NOT NULL DEFAULT 4,
  contact_only boolean NOT NULL DEFAULT false,
  highlight boolean NOT NULL DEFAULT false,
  visible boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  cta text NOT NULL DEFAULT 'Get started',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.plan_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_name text NOT NULL DEFAULT 'Features',
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  values jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.plan_catalog TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plan_catalog TO authenticated;
GRANT ALL ON public.plan_catalog TO service_role;

GRANT SELECT ON public.plan_features TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plan_features TO authenticated;
GRANT ALL ON public.plan_features TO service_role;

ALTER TABLE public.plan_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_features ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plan_catalog public read" ON public.plan_catalog FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "plan_catalog superadmin write" ON public.plan_catalog FOR ALL TO authenticated
  USING (public.is_superadmin()) WITH CHECK (public.is_superadmin());

CREATE POLICY "plan_features public read" ON public.plan_features FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "plan_features superadmin write" ON public.plan_features FOR ALL TO authenticated
  USING (public.is_superadmin()) WITH CHECK (public.is_superadmin());

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER plan_catalog_updated_at BEFORE UPDATE ON public.plan_catalog
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER plan_features_updated_at BEFORE UPDATE ON public.plan_features
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.plan_catalog (key, name, tagline, price_yearly, student_limit, room_limit, contact_only, highlight, sort_order, cta) VALUES
  ('free',   'Free',   'The whole daily operation, permanently free.', 0,     100,  4,  false, false, 1, 'Start free'),
  ('growth', 'Growth', 'Automation and reporting for a growing centre.', 4990, 400,  10, false, true,  2, 'Choose Growth'),
  ('campus', 'Campus', 'Control and insight for a large institute.',    12990, 1200, 30, false, false, 3, 'Choose Campus');

INSERT INTO public.plan_features (group_name, label, sort_order, values) VALUES
  ('Scale', 'Students included', 10, '{"free":"100","growth":"400","campus":"1,200"}'),
  ('Scale', 'Classrooms', 20, '{"free":"4","growth":"10","campus":"30"}'),
  ('Scale', 'Staff logins', 30, '{"free":"Unlimited","growth":"Unlimited","campus":"Unlimited"}'),
  ('Daily operation', 'Admissions, enquiries, students, batches', 40, '{"free":true,"growth":true,"campus":true}'),
  ('Daily operation', 'Attendance & fee collection', 50, '{"free":true,"growth":true,"campus":true}'),
  ('Daily operation', 'Tests, marks & syllabus tracker', 60, '{"free":true,"growth":true,"campus":true}'),
  ('Daily operation', 'Timetable with clash detection', 70, '{"free":true,"growth":true,"campus":true}'),
  ('Daily operation', 'Teacher, parent & student portals', 80, '{"free":true,"growth":true,"campus":true}'),
  ('Daily operation', 'WhatsApp messaging (manual send)', 90, '{"free":true,"growth":true,"campus":true}'),
  ('Automation', 'Scheduled WhatsApp fee reminders', 100, '{"free":false,"growth":true,"campus":true}'),
  ('Automation', 'Absentee alerts on autopilot', 110, '{"free":false,"growth":true,"campus":true}'),
  ('Automation', 'Bulk messaging by batch or filter', 120, '{"free":false,"growth":true,"campus":true}'),
  ('Insight & branding', 'Full reports suite', 130, '{"free":false,"growth":true,"campus":true}'),
  ('Insight & branding', 'Report cards (PDF)', 140, '{"free":false,"growth":true,"campus":true}'),
  ('Insight & branding', 'Branded receipts & documents', 150, '{"free":false,"growth":true,"campus":true}'),
  ('Insight & branding', 'Analytics with trends & forecasting', 160, '{"free":false,"growth":false,"campus":true}'),
  ('Control', 'Role-based permissions', 170, '{"free":false,"growth":false,"campus":true}'),
  ('Control', 'Audit log', 180, '{"free":false,"growth":false,"campus":true}'),
  ('Control', 'Custom fields', 190, '{"free":false,"growth":false,"campus":true}'),
  ('Control', 'API / webhooks', 200, '{"free":false,"growth":false,"campus":true}'),
  ('Support', 'Help centre & community', 210, '{"free":true,"growth":true,"campus":true}'),
  ('Support', 'Email support in 24h', 220, '{"free":false,"growth":true,"campus":true}'),
  ('Support', 'Priority WhatsApp line', 230, '{"free":false,"growth":false,"campus":true}'),
  ('Support', 'Assisted onboarding & migration', 240, '{"free":false,"growth":false,"campus":true}');