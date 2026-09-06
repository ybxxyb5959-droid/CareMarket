begin;

create table if not exists public.customer_inquiries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  category text not null check (category in (
    '주문/결제',
    '배송',
    '취소/반품/환불',
    '상품',
    '회원',
    '기타'
  )),
  order_id uuid references public.orders(order_id) on delete set null,
  title text not null check (char_length(btrim(title)) between 1 and 160),
  content text not null check (char_length(btrim(content)) between 1 and 4000),
  contact_email text not null check (
    char_length(contact_email) <= 254
    and contact_email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  ),
  privacy_agreed boolean not null check (privacy_agreed),
  status text not null default 'received' check (status in ('received', 'in_progress', 'answered')),
  admin_note text check (admin_note is null or char_length(admin_note) <= 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  answered_at timestamptz,
  answered_by uuid references public.profiles(user_id) on delete set null
);

create index if not exists customer_inquiries_user_created_at_idx
  on public.customer_inquiries (user_id, created_at desc);
create index if not exists customer_inquiries_status_created_at_idx
  on public.customer_inquiries (status, created_at desc);

create or replace function public.set_customer_inquiries_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

drop trigger if exists customer_inquiries_set_updated_at on public.customer_inquiries;
create trigger customer_inquiries_set_updated_at
before update on public.customer_inquiries
for each row execute function public.set_customer_inquiries_updated_at();

revoke all on function public.set_customer_inquiries_updated_at() from public, anon, authenticated;

alter table public.customer_inquiries enable row level security;

drop policy if exists customer_inquiries_insert_own on public.customer_inquiries;
create policy customer_inquiries_insert_own
  on public.customer_inquiries
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and privacy_agreed
    and status = 'received'
    and admin_note is null
    and answered_at is null
    and answered_by is null
    and (
      order_id is null
      or exists (
        select 1
        from public.orders
        where orders.order_id = customer_inquiries.order_id
          and orders.user_id = (select auth.uid())
      )
    )
  );

drop policy if exists customer_inquiries_admin_select on public.customer_inquiries;
create policy customer_inquiries_admin_select
  on public.customer_inquiries
  for select
  to authenticated
  using ((select public.is_admin()));

drop policy if exists customer_inquiries_admin_update on public.customer_inquiries;
create policy customer_inquiries_admin_update
  on public.customer_inquiries
  for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

revoke all on table public.customer_inquiries from public, anon, authenticated;
grant insert (
  id,
  user_id,
  category,
  order_id,
  title,
  content,
  contact_email,
  privacy_agreed
) on table public.customer_inquiries to authenticated;
grant select on table public.customer_inquiries to authenticated;
grant update (status, admin_note, answered_at, answered_by)
  on table public.customer_inquiries to authenticated;
grant select, update on table public.customer_inquiries to service_role;

comment on table public.customer_inquiries is 'Authenticated customer support inquiries; only administrators can review stored inquiries.';
comment on column public.customer_inquiries.admin_note is 'Internal administrator note. Never exposed to customer clients.';

commit;
