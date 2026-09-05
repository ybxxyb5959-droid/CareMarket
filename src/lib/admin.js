import { supabase } from './supabase'
export {
  ALLERGEN_OPTIONS,
  NEXT_ORDER_STATUS,
  ORDER_STATUS_LABELS,
  PRODUCT_CATEGORIES,
  toAdminProductForm,
  validateAdminProduct,
} from './admin-validation'
import { validateAdminProduct } from './admin-validation'

export async function fetchAdminProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('product_id', { ascending: true })
  if (error) throw error
  return data || []
}

export async function saveAdminProduct(form, productId) {
  const payload = validateAdminProduct(form)
  const query = productId
    ? supabase.from('products').update(payload).eq('product_id', productId)
    : supabase.from('products').insert(payload)
  const { data, error } = await query.select().single()
  if (error) throw error
  return data
}

export async function fetchAdminOrders() {
  const [{ data: orders, error: ordersError }, { data: profiles, error: profilesError }] = await Promise.all([
    supabase
      .from('orders')
      .select('order_id, user_id, toss_order_id, total_price, status, created_at, order_items(product_id, quantity, price_at_order, products(name, brand))')
      .order('created_at', { ascending: false }),
    supabase.from('profiles').select('user_id, display_name'),
  ])
  if (ordersError) throw ordersError
  if (profilesError) throw profilesError

  const namesByUserId = new Map((profiles || []).map((profile) => [profile.user_id, profile.display_name]))
  return (orders || []).map((order) => ({
    ...order,
    buyerName: namesByUserId.get(order.user_id) || '회원',
  }))
}

export async function updateAdminOrderStatus(orderId, nextStatus) {
  const { data, error } = await supabase.rpc('admin_update_order_status', {
    p_order_id: orderId,
    p_new_status: nextStatus,
  })
  if (error) throw error
  return data
}
