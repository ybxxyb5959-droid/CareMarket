begin;
create table public.review_reports (
  id uuid primary key default gen_random_uuid(),
  target text not null,
  product_id bigint not null references public.products(product_id),
  review_id uuid references public.reviews(id),
  reporter_id uuid not null references public.profiles(user_id),
  reason text not null check (reason in ('비방하는 행위', '광고성', '제품과 관련이 없음', '기타')),
  detail text not null default '' check (char_length(detail) <= 1000),
  content text not null,
  status text not null default 'received' check (status in ('received', 'dismissed', 'deleted')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(user_id),
  unique (target, reporter_id)
);
create index review_reports_status_created_idx on public.review_reports(status, created_at desc);
alter table public.review_reports enable row level security;
revoke all on public.review_reports from public, anon, authenticated;
create table public.deleted_sample_reviews (
  target text primary key,
  product_id bigint not null references public.products(product_id),
  deleted_at timestamptz not null default now()
);
alter table public.deleted_sample_reviews enable row level security;
revoke all on public.deleted_sample_reviews from public, anon, authenticated;
grant select on public.deleted_sample_reviews to anon, authenticated;
create policy deleted_sample_reviews_read on public.deleted_sample_reviews for select to anon, authenticated using (true);

create function public.submit_review_report(p_target text, p_product_id bigint, p_reason text, p_detail text default '', p_content text default '')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_review public.reviews; v_id uuid; v_content text;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_target is null or p_product_id is null or p_reason is null or p_reason not in ('비방하는 행위', '광고성', '제품과 관련이 없음', '기타')
    or char_length(coalesce(p_detail, '')) > 1000 or (p_reason = '기타' and char_length(btrim(coalesce(p_detail, ''))) < 2)
    then raise exception 'Invalid report' using errcode = '22023'; end if;
  if p_target ~ ('^' || p_product_id::text || '-sample-[0-4]$') then
    perform pg_advisory_xact_lock(hashtextextended(p_target, 0));
    if exists(select 1 from public.deleted_sample_reviews where target = p_target) then raise exception 'Review unavailable'; end if;
    v_content := left(btrim(coalesce(p_content, '')), 1000);
    if v_content = '' then raise exception 'Invalid sample content'; end if;
  else
    select * into v_review from public.reviews where id = p_target::uuid and product_id = p_product_id for update;
    if not found or v_review.deleted_at is not null or v_review.is_hidden then raise exception 'Review unavailable'; end if;
    v_content := v_review.content;
  end if;
  insert into public.review_reports(target, product_id, review_id, reporter_id, reason, detail, content)
    values (p_target, p_product_id, v_review.id, auth.uid(), p_reason, case when p_reason = '기타' then btrim(coalesce(p_detail, '')) else '' end, v_content)
    on conflict (target, reporter_id) do nothing returning id into v_id;
  return jsonb_build_object('id', v_id, 'duplicate', v_id is null);
end; $$;

create function public.get_admin_review_reports()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Administrator role required' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(row_to_json(t) order by t.created_at desc) from (
    select r.*, p.name as product_name, pr.display_name as reporter_name,
      case when r.review_id is null then '기본 표시 후기' else '구매 확인 후기' end as review_type
    from public.review_reports r join public.products p on p.product_id = r.product_id
    join public.profiles pr on pr.user_id = r.reporter_id
  ) t), '[]'::jsonb);
end; $$;

create function public.resolve_review_report(p_report_id uuid, p_action text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_report public.review_reports;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Administrator role required' using errcode = '42501'; end if;
  if p_action is null or p_action not in ('deleted', 'dismissed') then raise exception 'Invalid action' using errcode = '22023'; end if;
  select * into v_report from public.review_reports where id = p_report_id;
  if not found then raise exception 'Report not found'; end if;
  -- Serialize reports for one target, including concurrent submission and deletion.
  if v_report.review_id is not null then
    perform 1 from public.reviews where id = v_report.review_id for update;
  else
    perform pg_advisory_xact_lock(hashtextextended(v_report.target, 0));
  end if;
  select * into v_report from public.review_reports where id = p_report_id for update;
  if v_report.status <> 'received' then raise exception 'Report already resolved'; end if;
  if p_action = 'deleted' then
    if v_report.review_id is not null then
      update public.reviews set deleted_at = coalesce(deleted_at, clock_timestamp()) where id = v_report.review_id;
    else
      insert into public.deleted_sample_reviews(target, product_id) values (v_report.target, v_report.product_id) on conflict do nothing;
    end if;
    update public.review_reports set status = 'deleted', resolved_at = clock_timestamp(), resolved_by = auth.uid()
      where target = v_report.target and status = 'received';
  else
    update public.review_reports set status = 'dismissed', resolved_at = clock_timestamp(), resolved_by = auth.uid() where id = p_report_id;
  end if;
  return jsonb_build_object('id', p_report_id, 'status', p_action);
end; $$;
revoke all on function public.submit_review_report(text,bigint,text,text,text) from public, anon;
revoke all on function public.get_admin_review_reports() from public, anon;
revoke all on function public.resolve_review_report(uuid,text) from public, anon;
grant execute on function public.submit_review_report(text,bigint,text,text,text) to authenticated;
grant execute on function public.get_admin_review_reports() to authenticated;
grant execute on function public.resolve_review_report(uuid,text) to authenticated;
commit;
