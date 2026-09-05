-- Prepared for the CareMarket administrator test account: care@test.com.
-- Review the UUID in Dashboard > Authentication > Users before running.

begin;

update public.profiles
set role = 'admin'
where user_id = 'f683edf1-c67a-47b6-a6c4-1e33fab9dea1'::uuid
  and role = 'user';

commit;
