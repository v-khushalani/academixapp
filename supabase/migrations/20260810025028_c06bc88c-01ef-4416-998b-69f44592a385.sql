
-- Bulk update RLS policies for all tables that have institute_id
do $$
declare
    t text;
begin
    for t in select table_name from information_schema.columns where column_name = 'institute_id' and table_schema = 'public'
    loop
        execute format('alter table public.%I enable row level security', t);
        execute format('drop policy if exists "Tenant isolation" on public.%I', t);
        execute format('create policy "Tenant isolation" on public.%I for all to authenticated using (institute_id = public.current_institute_id())', t);
    end loop;
end;
$$;

-- Specific policies for user_roles and profiles to prevent lockout
drop policy if exists "Profiles: read own or staff can read all" on public.profiles;
create policy "Profiles: read own or staff can read all" on public.profiles for select to authenticated 
using ((id = auth.uid()) OR public.has_any_role(auth.uid(), array['owner'::app_role, 'admin'::app_role]));

drop policy if exists "UserRoles: read own or admin all" on public.user_roles;
create policy "UserRoles: read own or admin all" on public.user_roles for select to authenticated 
using ((user_id = auth.uid()) OR public.has_any_role(auth.uid(), array['owner'::app_role, 'admin'::app_role]));
