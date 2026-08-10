
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
  v_student_id uuid;
begin
  -- Fetch current state
  select amount, amount_paid, receipt_no, description, institute_id, student_id
  into v_amount, v_paid, v_receipt_no, v_description, v_institute_id, v_student_id
  from public.fees
  where id = _fee_id;

  -- Verify tenant access (if not superadmin)
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
    -- Generate receipt number
    v_receipt_no := 'RCP-' || to_char(now(), 'YYMMDD') || '-' || upper(substring(md5(random()::text) from 1 for 4));
  end if;

  update public.fees
  set 
    amount_paid = v_paid,
    status = v_status,
    method = _method,
    paid_date = current_date,
    receipt_no = v_receipt_no,
    description = case when _note is not null then coalesce(v_description, '') || (case when v_description is not null then ' · ' else '' end) || _note else v_description end
  where id = _fee_id;
end;
$$;

grant execute on function public.collect_fee_payment(uuid, decimal, text, text) to authenticated;
