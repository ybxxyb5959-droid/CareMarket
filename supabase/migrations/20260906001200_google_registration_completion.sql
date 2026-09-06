-- Complete the existing OAuth-created profile; do not insert profiles or coupons.
begin;
create or replace function public.complete_google_registration(
  p_display_name text, p_phone text, p_postal_code text,
  p_address text, p_address_detail text,
  p_terms_agreed boolean, p_privacy_agreed boolean, p_marketing_agreed boolean
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if not exists (
    select 1
    from auth.users
    where id = current_user_id
      and (
        raw_app_meta_data ->> 'provider' = 'google'
        or coalesce(raw_app_meta_data -> 'providers', '[]'::jsonb) ? 'google'
      )
  ) then
    raise exception 'Google account required' using errcode = '42501';
  end if;
  if not coalesce(p_terms_agreed, false) or not coalesce(p_privacy_agreed, false)
    or nullif(trim(p_display_name), '') is null
    or nullif(trim(p_phone), '') is null or nullif(trim(p_address), '') is null then
    raise exception 'Required registration fields missing' using errcode = '22023';
  end if;
  update public.profiles
  set display_name = trim(p_display_name), phone = trim(p_phone),
      postal_code = nullif(trim(p_postal_code), ''), address = trim(p_address),
      address_detail = nullif(trim(p_address_detail), ''),
      terms_agreed_at = coalesce(terms_agreed_at, now()),
      privacy_agreed_at = coalesce(privacy_agreed_at, now()),
      marketing_agreed_at = case when p_marketing_agreed then coalesce(marketing_agreed_at, now()) else marketing_agreed_at end
  where user_id = current_user_id;
  if not found then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;
end;
$$;
revoke all on function public.complete_google_registration(text,text,text,text,text,boolean,boolean,boolean) from public, anon;
grant execute on function public.complete_google_registration(text,text,text,text,text,boolean,boolean,boolean) to authenticated;
commit;
