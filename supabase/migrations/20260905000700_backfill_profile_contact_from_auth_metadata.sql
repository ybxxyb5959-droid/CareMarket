-- Backfill checkout contact fields for accounts created before the profile-contact migration.
-- Existing non-empty profile values always win; this migration is safe to run repeatedly.

begin;

update public.profiles as profile
set phone = coalesce(
      nullif(trim(profile.phone), ''),
      nullif(trim(auth_user.raw_user_meta_data ->> 'phone'), '')
    ),
    postal_code = coalesce(
      nullif(trim(profile.postal_code), ''),
      nullif(trim(auth_user.raw_user_meta_data ->> 'postal_code'), '')
    ),
    address = coalesce(
      nullif(trim(profile.address), ''),
      nullif(trim(auth_user.raw_user_meta_data ->> 'address'), '')
    ),
    address_detail = coalesce(
      nullif(trim(profile.address_detail), ''),
      nullif(trim(auth_user.raw_user_meta_data ->> 'address_detail'), '')
    )
from auth.users as auth_user
where profile.user_id = auth_user.id
  and (
    (nullif(trim(profile.phone), '') is null
      and nullif(trim(auth_user.raw_user_meta_data ->> 'phone'), '') is not null)
    or (nullif(trim(profile.postal_code), '') is null
      and nullif(trim(auth_user.raw_user_meta_data ->> 'postal_code'), '') is not null)
    or (nullif(trim(profile.address), '') is null
      and nullif(trim(auth_user.raw_user_meta_data ->> 'address'), '') is not null)
    or (nullif(trim(profile.address_detail), '') is null
      and nullif(trim(auth_user.raw_user_meta_data ->> 'address_detail'), '') is not null)
  );

commit;

