CREATE OR REPLACE FUNCTION public.institute_has_material_engine(_iid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.institutes i
    WHERE i.id = _iid
      AND i.plan <> 'free'
      AND COALESCE((i.features->>'material_engine')::boolean, false) = true
  ) AND NOT EXISTS (
    SELECT 1 FROM public.platform_feature_flags f WHERE f.key = 'material_engine' AND f.enabled = false
  )
$$;
REVOKE ALL ON FUNCTION public.institute_has_material_engine(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.institute_has_material_engine(uuid) TO authenticated;

CREATE TABLE public.material_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id uuid NOT NULL REFERENCES public.institutes(id) ON DELETE CASCADE,
  title text NOT NULL,
  file_path text,
  file_name text,
  file_type text,
  file_size bigint,
  checksum text,
  programme text,
  class_level text,
  subject text,
  chapter text,
  rights_status text NOT NULL DEFAULT 'reference_only' CHECK (rights_status IN ('owned','licensed','reference_only','unknown')),
  notes text,
  extracted_text text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institute_id, checksum)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.material_sources TO authenticated;
GRANT ALL ON public.material_sources TO service_role;
ALTER TABLE public.material_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "material_sources admin" ON public.material_sources FOR ALL TO authenticated
  USING (public.role_in_institute(institute_id, ARRAY['owner','admin']::app_role[]) AND public.institute_has_material_engine(institute_id))
  WITH CHECK (public.role_in_institute(institute_id, ARRAY['owner','admin']::app_role[]) AND public.institute_has_material_engine(institute_id));

CREATE TABLE public.material_outputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id uuid NOT NULL REFERENCES public.institutes(id) ON DELETE CASCADE,
  source_id uuid REFERENCES public.material_sources(id) ON DELETE SET NULL,
  kind text NOT NULL CHECK (kind IN ('notes','questions','formula_sheet')),
  title text NOT NULL,
  class_level text,
  subject text,
  chapter text,
  content text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved')),
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.material_outputs TO authenticated;
GRANT ALL ON public.material_outputs TO service_role;
ALTER TABLE public.material_outputs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "material_outputs admin" ON public.material_outputs FOR ALL TO authenticated
  USING (public.role_in_institute(institute_id, ARRAY['owner','admin']::app_role[]) AND public.institute_has_material_engine(institute_id))
  WITH CHECK (public.role_in_institute(institute_id, ARRAY['owner','admin']::app_role[]) AND public.institute_has_material_engine(institute_id));

CREATE TRIGGER material_sources_updated BEFORE UPDATE ON public.material_sources FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER material_outputs_updated BEFORE UPDATE ON public.material_outputs FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX ON public.material_sources (institute_id, created_at DESC);
CREATE INDEX ON public.material_outputs (institute_id, created_at DESC);

INSERT INTO public.platform_feature_flags (key, enabled, note) VALUES ('material_engine', true, 'Paid add-on; per-institute opt-in')
ON CONFLICT (key) DO NOTHING;

CREATE POLICY "materials storage" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'materials' AND public.role_in_institute(((storage.foldername(name))[1])::uuid, ARRAY['owner','admin']::app_role[]) AND public.institute_has_material_engine(((storage.foldername(name))[1])::uuid))
  WITH CHECK (bucket_id = 'materials' AND public.role_in_institute(((storage.foldername(name))[1])::uuid, ARRAY['owner','admin']::app_role[]) AND public.institute_has_material_engine(((storage.foldername(name))[1])::uuid));