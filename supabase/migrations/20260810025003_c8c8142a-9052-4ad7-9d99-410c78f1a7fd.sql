
-- Add institute_id to user_roles if it was missing from the check (I saw it in info_schema but let's be sure about uniqueness)
alter table public.user_roles drop constraint if exists user_roles_user_id_role_key;
alter table public.user_roles add constraint user_roles_user_id_role_institute_key unique (user_id, role, institute_id);

-- Enforce institute_id on student creation if not present
create or replace function public.set_institute_id()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.institute_id is null then
    new.institute_id := public.current_institute_id();
  end if;
  return new;
end;
$$;

-- Apply to major tables
do $$
declare
    t text;
begin
    for t in select table_name from information_schema.columns where column_name = 'institute_id' and table_schema = 'public'
    loop
        execute format('drop trigger if exists set_institute_id_trigger on public.%I', t);
        execute format('create trigger set_institute_id_trigger before insert on public.%I for each row execute function public.set_institute_id()', t);
    end loop;
end;
$$;
