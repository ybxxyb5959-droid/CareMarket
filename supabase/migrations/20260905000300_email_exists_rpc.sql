-- CareMarket: 회원가입 시 이메일 중복 실시간 안내를 위한 조회 함수.
-- 가입 폼에서 입력 즉시 "이미 가입되어 있는 이메일" 여부만 반환한다.

begin;

create or replace function public.email_exists(p_email text)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from auth.users
    where lower(email) = lower(trim(p_email))
  );
$$;

revoke all on function public.email_exists(text) from public;
grant execute on function public.email_exists(text) to anon, authenticated;

commit;
