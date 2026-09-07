const normalizeRows = data => Array.isArray(data) ? data : []

export async function fetchMyReviewItems(client) {
  const { data, error } = await client.rpc('get_my_review_items')
  if (error) throw error
  return normalizeRows(data).map(row => ({
    ...row,
    product_id: Number(row.product_id),
    quantity: Number(row.quantity),
    reviewed: Boolean(row.reviewed),
    reward_issued: Boolean(row.reward_issued),
    review_hidden: Boolean(row.review_hidden),
    review_rating: row.review_rating == null ? null : Number(row.review_rating),
    reward_coupon_percent: row.reward_coupon_percent == null ? null : Number(row.reward_coupon_percent),
  }))
}

export async function fetchPublicProductReviews(client, productId, limit = 5) {
  const numericProductId = Number(productId)
  if (!Number.isSafeInteger(numericProductId) || numericProductId < 1) throw new Error('INVALID_PRODUCT_ID')
  const { data, error } = await client.rpc('get_public_product_reviews', {
    p_product_id: numericProductId,
    p_limit: Math.min(50, Math.max(1, Number(limit) || 5)),
  })
  if (error) throw error
  if (!data || !Array.isArray(data.reviews)) throw new Error('INVALID_REVIEW_RESPONSE')
  return {
    reviews: data.reviews,
    count: Number(data.count) || 0,
    average: data.average == null ? null : Number(data.average),
  }
}

export async function submitOrderItemReview(client, { orderItemId, rating, content, requestId }) {
  const trimmed = String(content || '').trim()
  if (!orderItemId) throw new Error('INVALID_ORDER_ITEM')
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new Error('INVALID_REVIEW_RATING')
  if (trimmed.length < 20 || trimmed.length > 1000) throw new Error('INVALID_REVIEW_CONTENT')
  if (!requestId) throw new Error('INVALID_REVIEW_REQUEST')
  const { data, error } = await client.rpc('submit_order_item_review', {
    p_order_item_id: orderItemId,
    p_rating: rating,
    p_content: trimmed,
    p_request_id: requestId,
  })
  if (error) throw error
  if (!data?.review_id) throw new Error('INVALID_REVIEW_RESPONSE')
  return data
}

export async function updateMyReview(client, { reviewId, rating, content }) {
  const trimmed = String(content || '').trim()
  if (!reviewId) throw new Error('INVALID_REVIEW')
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new Error('INVALID_REVIEW_RATING')
  if (trimmed.length < 20 || trimmed.length > 1000) throw new Error('INVALID_REVIEW_CONTENT')
  const { data, error } = await client.rpc('update_my_review', {
    p_review_id: reviewId,
    p_rating: rating,
    p_content: trimmed,
  })
  if (error) throw error
  if (!data?.review_id) throw new Error('INVALID_REVIEW_RESPONSE')
  return data
}

export async function deleteMyReview(client, reviewId) {
  if (!reviewId) throw new Error('INVALID_REVIEW')
  const { data, error } = await client.rpc('delete_my_review', { p_review_id: reviewId })
  if (error) throw error
  if (!data?.review_id || !data?.deleted_at) throw new Error('INVALID_REVIEW_RESPONSE')
  return data
}

export async function fetchAdminReviews(client) {
  const { data, error } = await client.rpc('get_admin_reviews')
  if (error) throw error
  return normalizeRows(data)
}

export async function moderateReview(client, reviewId, hidden, reason = '') {
  const { data, error } = await client.rpc('moderate_review', {
    p_review_id: reviewId,
    p_hidden: Boolean(hidden),
    p_reason: hidden ? String(reason || '').trim() : null,
  })
  if (error) throw error
  return data
}
