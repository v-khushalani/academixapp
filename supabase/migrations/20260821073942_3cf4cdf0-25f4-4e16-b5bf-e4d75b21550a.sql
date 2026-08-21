create or replace function public.platform_set_parent(_id uuid, _parent_institute_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not public.is_superadmin() then
    raise exception 'Not allowed';
  end if;
  if _parent_institute_id is not null and _parent_institute_id = _id then
    raise exception 'An institute cannot be its own parent';
  end if;
  update public.institutes set parent_institute_id = _parent_institute_id, updated_at = now()
   where id = _id;
end;
$function$;

revoke all on function public.platform_set_parent(uuid, uuid) from public;
grant execute on function public.platform_set_parent(uuid, uuid) to authenticated;