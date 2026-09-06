begin;
-- Expose product ranking only, never customer/order details.
create function public.get_best_products() returns setof public.products
language sql stable security definer set search_path = '' as $$
  select p.* from public.products p
  join (
    select i.product_id, sum(i.quantity) as sold
    from public.order_items i join public.orders o on o.order_id = i.order_id
    where o.status in ('paid', 'preparing', 'shipped', 'delivered')
    group by i.product_id
  ) sales on sales.product_id = p.product_id
  where p.is_active
  order by sales.sold desc, p.created_at desc, p.product_id
  limit 100;
$$;
revoke all on function public.get_best_products() from public;
grant execute on function public.get_best_products() to anon, authenticated;
commit;
