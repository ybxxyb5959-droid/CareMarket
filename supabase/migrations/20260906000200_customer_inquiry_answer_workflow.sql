begin;

alter table public.customer_inquiries
  add column if not exists admin_answer text;

do $constraints$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.customer_inquiries'::regclass
      and conname = 'customer_inquiries_admin_answer_length'
  ) then
    alter table public.customer_inquiries
      add constraint customer_inquiries_admin_answer_length
      check (admin_answer is null or char_length(btrim(admin_answer)) between 1 and 4000);
  end if;
end;
$constraints$;

drop policy if exists customer_inquiries_select_own on public.customer_inquiries;
create policy customer_inquiries_select_own
  on public.customer_inquiries
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Customers and administrators read only the customer-visible inquiry columns.
-- In particular, the pre-existing internal admin_note column stays inaccessible.
revoke select on table public.customer_inquiries from authenticated;
grant select (
  id,
  user_id,
  category,
  order_id,
  title,
  content,
  contact_email,
  status,
  created_at,
  admin_answer,
  answered_at
) on table public.customer_inquiries to authenticated;

-- Answer fields may only be changed through the guarded, atomic RPC below.
revoke update on table public.customer_inquiries from authenticated;
revoke update (status, admin_note, answered_at, answered_by)
  on table public.customer_inquiries from authenticated;

create or replace function public.admin_answer_customer_inquiry(
  p_inquiry_id uuid,
  p_answer text
)
returns public.customer_inquiries
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_answer text := btrim(coalesce(p_answer, ''));
  v_inquiry public.customer_inquiries;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if not public.is_admin() then
    raise exception 'Administrator role required' using errcode = '42501';
  end if;

  if char_length(v_answer) < 1 or char_length(v_answer) > 4000 then
    raise exception 'Answer must contain between 1 and 4000 characters'
      using errcode = '22023';
  end if;

  select *
  into v_inquiry
  from public.customer_inquiries
  where id = p_inquiry_id
  for update;

  if not found then
    raise exception 'Customer inquiry not found' using errcode = 'P0002';
  end if;

  if v_inquiry.status = 'answered' then
    raise exception 'Customer inquiry is already answered' using errcode = '22023';
  end if;

  update public.customer_inquiries
  set
    admin_answer = v_answer,
    status = 'answered',
    answered_at = clock_timestamp(),
    answered_by = auth.uid()
  where id = p_inquiry_id
  returning * into v_inquiry;

  return v_inquiry;
end;
$function$;

revoke all on function public.admin_answer_customer_inquiry(uuid, text)
  from public, anon;
grant execute on function public.admin_answer_customer_inquiry(uuid, text)
  to authenticated;

comment on column public.customer_inquiries.admin_answer is
  'Single administrator answer shown to the inquiry owner.';
comment on function public.admin_answer_customer_inquiry(uuid, text) is
  'Atomically records the single customer-visible answer and its administrator audit fields.';

commit;
