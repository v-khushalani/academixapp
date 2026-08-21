-- 1. Pricing v4 (yearly)
update public.plan_catalog set price_yearly = 5990 where key = 'growth';
update public.plan_catalog set price_yearly = 14990 where key = 'campus';

-- 2. Active institute (branch) per user
alter table public.profiles add column if not exists active_institute_id uuid references public.institutes(id) on delete set null;

create or replace function public.current_institute_id()
returns uuid
language plpgsql
stable security definer
set search_path to 'public'
as $function$
declare
  v_active uuid;
  v_user_id uuid := auth.uid();
begin
  select p.active_institute_id into v_active from public.profiles p where p.id = v_user_id;

  if v_active is not null and exists (
    select 1 from public.my_institute_ids() m(id) where m.id = v_active
  ) then
    return v_active;
  end if;

  return (
    select institute_id from public.user_roles
    where user_id = v_user_id and institute_id is not null
    order by created_at desc limit 1
  );
end;
$function$;

-- 3. Institutes the signed-in user can switch between (own + branches)
create or replace function public.my_institutes()
returns table(id uuid, name text, parent_institute_id uuid, is_active boolean)
language sql
stable security definer
set search_path to 'public'
as $function$
  select i.id, i.name, i.parent_institute_id,
         (i.id = public.current_institute_id()) as is_active
  from public.institutes i
  where i.id in (select m.id from public.my_institute_ids() m(id))
  order by (i.parent_institute_id is not null), i.name;
$function$;

create or replace function public.set_active_institute(_institute_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not exists (select 1 from public.my_institute_ids() m(id) where m.id = _institute_id) then
    raise exception 'Not allowed for this institute';
  end if;
  update public.profiles set active_institute_id = _institute_id, updated_at = now()
   where id = auth.uid();
end;
$function$;

-- 4. Branch rollup for a group (parent + its branches)
create or replace function public.group_overview()
returns table(
  institute_id uuid, name text, is_branch boolean,
  students bigint, batches bigint, billed numeric, collected numeric
)
language sql
stable security definer
set search_path to 'public'
as $function$
  select i.id, i.name, (i.parent_institute_id is not null),
    (select count(*) from public.students s where s.institute_id = i.id and s.status = 'active'),
    (select count(*) from public.batches b where b.institute_id = i.id and b.status = 'active'),
    coalesce((select sum(f.amount) from public.fees f where f.institute_id = i.id and f.status <> 'cancelled'), 0),
    coalesce((select sum(f.amount_paid) from public.fees f where f.institute_id = i.id and f.status <> 'cancelled'), 0)
  from public.institutes i
  where i.id in (select m.id from public.my_institute_ids() m(id))
  order by (i.parent_institute_id is not null), i.name;
$function$;

revoke all on function public.my_institutes() from public;
revoke all on function public.set_active_institute(uuid) from public;
revoke all on function public.group_overview() from public;
grant execute on function public.my_institutes() to authenticated;
grant execute on function public.set_active_institute(uuid) to authenticated;
grant execute on function public.group_overview() to authenticated;