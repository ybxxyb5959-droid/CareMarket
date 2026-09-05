-- CareMarket: extend profiles with contact + agreement fields for real-store signup.
-- Additive only. Existing rows keep NULLs; app tolerates NULL contact values.

begin;

alter table public.profiles
  add column if not exists phone text,
  add column if not exists postal_code text,
  add column if not exists address text,
  add column if not exists address_detail text,
  add column if not exists terms_agreed_at timestamptz,
  add column if not exists privacy_agreed_at timestamptz,
  add column if not exists marketing_agreed_at timestamptz;

-- Extend the existing signup trigger to capture optional contact + agreement metadata
-- passed through auth signUp options.data. Keeps display_name / role / primary_goal behavior.
create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  insert into public.profiles (
    user_id,
    display_name,
    role,
    primary_goal,
    phone,
    postal_code,
    address,
    address_detail,
    terms_agreed_at,
    privacy_agreed_at,
    marketing_agreed_at
  )
  values (
    new.id,
    coalesce(
      nullif(trim(meta ->> 'display_name'), ''),
      split_part(new.email, '@', 1)
    ),
    'user',
    null,
    nullif(trim(meta ->> 'phone'), ''),
    nullif(trim(meta ->> 'postal_code'), ''),
    nullif(trim(meta ->> 'address'), ''),
    nullif(trim(meta ->> 'address_detail'), ''),
    case when coalesce((meta ->> 'terms_agreed')::boolean, false) then now() end,
    case when coalesce((meta ->> 'privacy_agreed')::boolean, false) then now() end,
    case when coalesce((meta ->> 'marketing_agreed')::boolean, false) then now() end
  );

  return new;
end;
$$;

-- Allow a signed-in user to update only their own contact fields (never role / goal).
create or replace function public.update_my_profile(
  p_display_name text,
  p_phone text,
  p_postal_code text,
  p_address text,
  p_address_detail text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_display_name is null or length(trim(p_display_name)) = 0 then
    raise exception 'Display name required' using errcode = '22023';
  end if;

  update public.profiles
  set display_name   = trim(p_display_name),
      phone          = nullif(trim(coalesce(p_phone, '')), ''),
      postal_code    = nullif(trim(coalesce(p_postal_code, '')), ''),
      address        = nullif(trim(coalesce(p_address, '')), ''),
      address_detail = nullif(trim(coalesce(p_address_detail, '')), '')
  where user_id = current_user_id;

  if not found then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.update_my_profile(text, text, text, text, text) from public;
revoke all on function public.update_my_profile(text, text, text, text, text) from anon;
grant execute on function public.update_my_profile(text, text, text, text, text) to authenticated;

commit;
