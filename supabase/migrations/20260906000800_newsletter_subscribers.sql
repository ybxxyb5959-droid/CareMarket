begin;
create table public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text unique not null check (email = lower(btrim(email)) and length(email) <= 254 and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  is_active boolean not null default true,
  subscribed_at timestamptz not null default now(),
  welcome_email_sent_at timestamptz
);
alter table public.newsletter_subscribers enable row level security;
revoke all on public.newsletter_subscribers from public, anon, authenticated;
grant select, insert, update on public.newsletter_subscribers to service_role;
commit;
