
-- Audit Logs: Record critical changes for Campus plan
CREATE TABLE public.audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    institute_id uuid NOT NULL REFERENCES public.institutes(id) ON DELETE CASCADE,
    actor_id uuid REFERENCES auth.users(id),
    action text NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    old_data jsonb,
    new_data jsonb,
    ip_address text,
    user_agent text,
    created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "AuditLogs: members can read their institute logs" 
ON public.audit_logs FOR SELECT TO authenticated
USING (institute_id IN (SELECT my_institute_ids()));

CREATE POLICY "AuditLogs: superadmin all" 
ON public.audit_logs FOR ALL TO authenticated
USING (is_superadmin());
