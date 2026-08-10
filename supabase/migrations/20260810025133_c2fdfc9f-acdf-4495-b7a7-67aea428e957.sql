
-- 1. Atomic Fee Collection RPC (Fixes concurrency & data integrity)
create or replace function public.collect_fee_payment(
  _fee_id uuid,
  _received decimal,
  _method text default 'Cash',
  _note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_amount decimal;
  v_paid decimal;
  v_receipt_no text;
  v_description text;
  v_status public.fee_status;
  v_institute_id uuid;
begin
  -- Row lock for atomicity
  select amount, amount_paid, receipt_no, description, institute_id
  into v_amount, v_paid, v_receipt_no, v_description, v_institute_id
  from public.fees
  where id = _fee_id
  for update;

  -- Verify tenant access
  if not is_superadmin() and v_institute_id != current_institute_id() then
    raise exception 'Unauthorized';
  end if;

  v_paid := coalesce(v_paid, 0) + _received;
  
  if v_paid >= v_amount then
    v_status := 'paid';
  elsif v_paid > 0 then
    v_status := 'partial';
  else
    v_status := 'pending';
  end if;

  if v_receipt_no is null then
    v_receipt_no := 'RCP-' || to_char(now(), 'YYMMDD') || '-' || upper(substring(md5(random()::text) from 1 for 4));
  end if;

  update public.fees
  set 
    amount_paid = v_paid,
    status = v_status,
    method = _method,
    paid_date = current_date,
    receipt_no = v_receipt_no,
    description = case 
      when _note is not null then 
        coalesce(v_description, '') || (case when v_description is not null then ' · ' else '' end) || _note 
      else v_description 
    end
  where id = _fee_id;
end;
$$;

-- 2. Bulk Dashboard Overview RPC (Fixes performance by consolidating 9 queries)
create or replace function public.get_dashboard_overview()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inst_id uuid;
  v_now timestamp := now();
  v_today date := current_date;
  v_month_start date := date_trunc('month', current_date)::date;
  v_last_month_start date := (date_trunc('month', current_date) - interval '1 month')::date;
  v_res jsonb;
begin
  v_inst_id := current_institute_id();

  with stats as (
    select count(*) as students from students where status = 'active' and approval_status = 'approved' and institute_id = v_inst_id
  ),
  batches as (
    select count(*) as count from batches where status = 'active' and institute_id = v_inst_id
  ),
  money as (
    select 
      sum(case when status != 'cancelled' then amount - coalesce(amount_paid, 0) else 0 end) as outstanding,
      sum(case when paid_date >= v_month_start then amount_paid else 0 end) as collected_this_month,
      sum(case when paid_date >= v_last_month_start and paid_date < v_month_start then amount_paid else 0 end) as collected_last_month
    from fees
    where institute_id = v_inst_id
  ),
  admissions as (
    select count(*) as pending from students where approval_status = 'pending' and institute_id = v_inst_id
  )
  select jsonb_build_object(
    'students', (select students from stats),
    'batches', (select count from batches),
    'money', (select jsonb_build_object(
      'outstanding', coalesce(outstanding, 0),
      'collectedThisMonth', coalesce(collected_this_month, 0),
      'collectedLastMonth', coalesce(collected_last_month, 0)
    ) from money),
    'pendingApprovals', (select pending from admissions)
  ) into v_res;

  return v_res;
end;
$$;

grant execute on function public.collect_fee_payment(uuid, decimal, text, text) to authenticated;
grant execute on function public.get_dashboard_overview() to authenticated;
