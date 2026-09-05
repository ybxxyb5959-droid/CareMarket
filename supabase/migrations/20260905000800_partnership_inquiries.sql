-- Public partnership intake with administrator-only review access.

create table if not exists public.partnership_inquiries (
  id uuid primary key default gen_random_uuid(),
  brand_name text not null check (char_length(btrim(brand_name)) between 1 and 120),
  contact_name text not null check (char_length(btrim(contact_name)) between 1 and 80),
  email text not null check (
    char_length(email) <= 254
    and email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  ),
  phone text check (phone is null or char_length(phone) <= 40),
  website text check (website is null or char_length(website) <= 500),
  proposal_type text not null check (proposal_type in (
    '브랜드 입점',
    '상품 입점',
    '콘텐츠 협업',
    '프로모션 / 공동 마케팅',
    '기타 제휴'
  )),
  product_category text not null check (char_length(btrim(product_category)) between 1 and 100),
  product_name text check (product_name is null or char_length(product_name) <= 160),
  brand_description text not null check (char_length(btrim(brand_description)) between 1 and 4000),
  partnership_reason text check (partnership_reason is null or char_length(partnership_reason) <= 3000),
  privacy_agreed boolean not null check (privacy_agreed),
  status text not null default 'new' check (status in ('new', 'reviewing', 'approved', 'rejected')),
  admin_note text check (admin_note is null or char_length(admin_note) <= 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(user_id) on delete set null,
  notification_sent_at timestamptz
);

create index if not exists partnership_inquiries_created_at_idx
  on public.partnership_inquiries (created_at desc);
create index if not exists partnership_inquiries_status_created_at_idx
  on public.partnership_inquiries (status, created_at desc);

create or replace function public.set_partnership_inquiries_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

drop trigger if exists partnership_inquiries_set_updated_at on public.partnership_inquiries;
create trigger partnership_inquiries_set_updated_at
before update on public.partnership_inquiries
for each row execute function public.set_partnership_inquiries_updated_at();

revoke all on function public.set_partnership_inquiries_updated_at() from public, anon, authenticated;

alter table public.partnership_inquiries enable row level security;

drop policy if exists partnership_inquiries_public_insert on public.partnership_inquiries;
create policy partnership_inquiries_public_insert
  on public.partnership_inquiries
  for insert
  to anon, authenticated
  with check (
    status = 'new'
    and admin_note is null
    and reviewed_at is null
    and reviewed_by is null
    and notification_sent_at is null
    and privacy_agreed
  );

drop policy if exists partnership_inquiries_admin_select on public.partnership_inquiries;
create policy partnership_inquiries_admin_select
  on public.partnership_inquiries
  for select
  to authenticated
  using ((select public.is_admin()));

drop policy if exists partnership_inquiries_admin_update on public.partnership_inquiries;
create policy partnership_inquiries_admin_update
  on public.partnership_inquiries
  for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

revoke all on table public.partnership_inquiries from public, anon, authenticated;
grant insert (
  id,
  brand_name,
  contact_name,
  email,
  phone,
  website,
  proposal_type,
  product_category,
  product_name,
  brand_description,
  partnership_reason,
  privacy_agreed
) on table public.partnership_inquiries to anon, authenticated;
grant select on table public.partnership_inquiries to authenticated;
grant update (status, admin_note, reviewed_at, reviewed_by)
  on table public.partnership_inquiries to authenticated;
grant select, update on table public.partnership_inquiries to service_role;

comment on table public.partnership_inquiries is 'Public brand partnership submissions; review data is administrator-only.';
comment on column public.partnership_inquiries.admin_note is 'Internal administrator note. Never exposed to public clients.';
