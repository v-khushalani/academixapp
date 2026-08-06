CREATE OR REPLACE FUNCTION public.mark_attendance_notified(_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_superadmin() OR public.has_any_role(auth.uid(), ARRAY['owner','admin','receptionist','counsellor']::app_role[])) THEN
    RAISE EXCEPTION 'Not authorised';
  END IF;
  UPDATE public.attendance
     SET notified_at = now()
   WHERE id = ANY(_ids)
     AND (public.is_superadmin() OR institute_id = public.current_institute_id());
END; $$;

GRANT EXECUTE ON FUNCTION public.mark_attendance_notified(uuid[]) TO authenticated;