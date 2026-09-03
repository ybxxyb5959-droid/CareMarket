begin;

alter table public.profiles enable row level security;

create policy profiles_select_own
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create function public.set_my_primary_goal(goal text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  if goal is null or goal not in (
    'muscle_gain',
    'weight_control',
    'nutrition_management',
    'supplement_search'
  ) then
    raise exception 'Invalid primary goal'
      using errcode = '22023';
  end if;

  update public.profiles
  set primary_goal = goal
  where user_id = current_user_id;

  if not found then
    raise exception 'Profile not found'
      using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.set_my_primary_goal(text) from public;
revoke all on function public.set_my_primary_goal(text) from anon;
grant execute on function public.set_my_primary_goal(text) to authenticated;

alter table public.user_preferences enable row level security;

create policy user_preferences_select_own
  on public.user_preferences
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy user_preferences_insert_own
  on public.user_preferences
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy user_preferences_update_own
  on public.user_preferences
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy user_preferences_delete_own
  on public.user_preferences
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

commit;
