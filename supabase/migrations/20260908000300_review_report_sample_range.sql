begin;
-- Include the expanded sample review list (up to 500 entries).
create or replace function public.submit_review_report(p_target text, p_product_id bigint, p_reason text, p_detail text default '', p_content text default '')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_review public.reviews; v_id uuid; v_content text;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_target is null or p_product_id is null or p_reason is null or p_reason not in ('비방하는 행위', '광고성', '제품과 관련이 없음', '기타')
    or char_length(coalesce(p_detail, '')) > 1000 or (p_reason = '기타' and char_length(btrim(coalesce(p_detail, ''))) < 2)
    then raise exception 'Invalid report' using errcode = '22023'; end if;
  if p_target ~ ('^' || p_product_id::text || '-sample-([0-9]|[1-9][0-9]|[1-4][0-9]{2})$') then
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
commit;
