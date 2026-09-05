export async function fetchMyOrders(client, userId) {
  const { data, error } = await client
    .from('orders')
    .select(`
      order_id,
      toss_order_id,
      total_price,
      status,
      created_at,
      recipient_name,
      recipient_phone,
      postal_code,
      address,
      address_detail,
      delivery_request,
      items:order_items (
        product_id,
        quantity,
        price_at_order,
        product:products (name, image_url)
      )
    `)
    .eq('user_id', userId)
    .in('status', ['paid', 'preparing', 'shipped', 'delivered'])
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}
