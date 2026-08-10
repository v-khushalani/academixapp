
create or replace function public.current_institute_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select institute_id
  from public.user_roles
  where user_id = auth.uid()
  limit 1;
$$;

create or replace function public.has_any_role(_user_id uuid, _roles public.app_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = any(_roles)
      and institute_id = current_institute_id()
  )
$$;

create or replace function public.is_my_student(_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.students
    where id = _student_id
      and (
        user_id = auth.uid()
        or 
        exists (
          select 1 from public.parent_students 
          where student_id = _student_id 
          and parent_user_id = auth.uid()
        )
      )
  )
$$;

grant execute on function public.current_institute_id() to authenticated;
grant execute on function public.has_any_role(uuid, public.app_role[]) to authenticated;
grant execute on function public.is_my_student(uuid) to authenticated;
