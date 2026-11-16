CREATE OR REPLACE FUNCTION public.platform_push_plan(_key text) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE p public.plan_catalog%ROWTYPE; n integer; BEGIN
 IF NOT public.is_superadmin() THEN RAISE EXCEPTION 'Not allowed'; END IF;
 SELECT * INTO p FROM public.plan_catalog WHERE key=_key; IF NOT FOUND THEN RAISE EXCEPTION 'Plan not found'; END IF;
 UPDATE public.institutes SET features=COALESCE(p.features,'{}') || COALESCE(features,'{}') WHERE plan=_key;
 GET DIAGNOSTICS n=ROW_COUNT; RETURN n;
END $$;
REVOKE EXECUTE ON FUNCTION public.apply_plan_catalog_to_members(text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.platform_push_plan(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.platform_push_plan(text) TO authenticated,service_role;