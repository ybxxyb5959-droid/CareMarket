function productId(value) {
  const id = Number(value)
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error('INVALID_PRODUCT_ID')
  return id
}

export async function fetchWishlistIds(client, userId) {
  if (!userId) return []
  const { data, error } = await client
    .from('wishlist_items')
    .select('product_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []).map((row) => productId(row.product_id))
}

export async function saveWishlistItem(client, userId, value, wished) {
  if (!userId) throw new Error('AUTH_REQUIRED')
  const id = productId(value)
  if (wished) {
    const { error } = await client
      .from('wishlist_items')
      .upsert({ user_id: userId, product_id: id }, { onConflict: 'user_id,product_id' })
    if (error) throw error
    return true
  }
  const { error } = await client
    .from('wishlist_items')
    .delete()
    .eq('user_id', userId)
    .eq('product_id', id)
  if (error) throw error
  return false
}
