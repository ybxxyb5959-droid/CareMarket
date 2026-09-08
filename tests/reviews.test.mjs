import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  fetchMyReviewItems,
  fetchPublicProductReviews,
  deleteMyReview,
  submitOrderItemReview,
  updateMyReview,
} from '../src/lib/reviews.js'

const migration = readFileSync(new URL('../supabase/migrations/20260907000100_delivered_review_rewards.sql', import.meta.url), 'utf8')
const productReviews = readFileSync(new URL('../src/components/ProductReviews.jsx', import.meta.url), 'utf8')
const reviewModal = readFileSync(new URL('../src/components/ReviewModal.jsx', import.meta.url), 'utf8')
const checkout = readFileSync(new URL('../src/pages/Checkout.jsx', import.meta.url), 'utf8')

test('review submission sends only the order item, rating, trimmed text and idempotency key', async () => {
  const calls = []
  const client = { async rpc(name, params) {
    calls.push({ name, params })
    return { data: { review_id: 'review-1', coupon_issued: true }, error: null }
  } }
  const result = await submitOrderItemReview(client, {
    orderItemId: 'item-1', rating: 1,
    content: '  포장 상태와 실제 맛을 충분히 경험하고 남기는 솔직한 후기입니다.  ',
    requestId: 'request-1',
    productId: 999,
    userId: 'forged-user',
  })
  assert.equal(result.review_id, 'review-1')
  assert.deepEqual(calls, [{
    name: 'submit_order_item_review',
    params: {
      p_order_item_id: 'item-1',
      p_rating: 1,
      p_content: '포장 상태와 실제 맛을 충분히 경험하고 남기는 솔직한 후기입니다.',
      p_request_id: 'request-1',
    },
  }])
})

test('review client rejects invalid rating and trimmed body length before RPC', async () => {
  let calls = 0
  const client = { async rpc() { calls += 1; return { data: null, error: null } } }
  await assert.rejects(submitOrderItemReview(client, { orderItemId: 'i', rating: 0, content: '가'.repeat(20), requestId: 'r' }), /INVALID_REVIEW_RATING/)
  await assert.rejects(submitOrderItemReview(client, { orderItemId: 'i', rating: 5, content: `  ${'가'.repeat(19)}  `, requestId: 'r' }), /INVALID_REVIEW_CONTENT/)
  await assert.rejects(submitOrderItemReview(client, { orderItemId: 'i', rating: 5, content: '가'.repeat(1001), requestId: 'r' }), /INVALID_REVIEW_CONTENT/)
  assert.equal(calls, 0)
})

test('eligibility and public review reads use dedicated least-privilege RPCs', async () => {
  const calls = []
  const client = { async rpc(name, params) {
    calls.push({ name, params })
    if (name === 'get_my_review_items') return { data: [{ product_id: '3', quantity: '2', reviewed: false, reward_issued: true }], error: null }
    return { data: { count: 7, average: 4.1, reviews: [] }, error: null }
  } }
  assert.deepEqual(await fetchMyReviewItems(client), [{
    product_id: 3, quantity: 2, reviewed: false, reward_issued: true,
    review_hidden: false, review_rating: null, reward_coupon_percent: null,
  }])
  assert.deepEqual(await fetchPublicProductReviews(client, 3, 5), { count: 7, average: 4.1, reviews: [] })
  assert.deepEqual(calls.map(call => call.name), ['get_my_review_items', 'get_public_product_reviews'])
})

test('review update and soft delete send only the authenticated review id and editable fields', async () => {
  const calls = []
  const client = { async rpc(name, params) {
    calls.push({ name, params })
    return name === 'update_my_review'
      ? { data: { review_id: 'review-1', rating: 2 }, error: null }
      : { data: { review_id: 'review-1', deleted_at: '2026-09-07T00:00:00Z' }, error: null }
  } }
  await updateMyReview(client, { reviewId: 'review-1', rating: 2, content: `  ${'수정한 리뷰 본문입니다. '.repeat(2)}  `, userId: 'forged' })
  await deleteMyReview(client, 'review-1')
  assert.deepEqual(calls.map(call => call.name), ['update_my_review', 'delete_my_review'])
  assert.deepEqual(Object.keys(calls[0].params).sort(), ['p_content', 'p_rating', 'p_review_id'])
  assert.deepEqual(calls[1].params, { p_review_id: 'review-1' })
})

test('migration enforces delivered ownership, one review per item and the historical order lock reused by the account reward guard', () => {
  assert.match(migration, /where oi\.order_item_id = p_order_item_id and o\.user_id = v_user_id[\s\S]*for update of o, oi/i)
  assert.match(migration, /if v_order_status <> 'delivered'/i)
  assert.match(migration, /rating[^;]*between 1 and 5/i)
  assert.match(migration, /char_length\(v_content\) not between 20 and 1000/i)
  assert.match(migration, /order_item_id uuid not null unique|where order_item_id = p_order_item_id/i)
  assert.match(migration, /reviews_user_request_unique/i)
  assert.match(migration, /user_coupons_review_order_once[\s\S]*reward_order_id/i)
  assert.match(migration, /insert into public\.reviews[\s\S]*insert into public\.user_coupons/i)
  assert.match(migration, /p_rating[\s\S]*values \(v_user_id, 'review10', 'review_reward', v_order_id\)/i)
  assert.match(migration, /set rating = p_rating,[\s\S]*deleted_at = null/i)
  assert.match(migration, /create or replace function public\.update_my_review/i)
  assert.match(migration, /create or replace function public\.delete_my_review[\s\S]*set deleted_at = clock_timestamp\(\)/i)
})

test('review storage is RPC-only and public reads exclude hidden rows and private order fields', () => {
  assert.match(migration, /revoke all on public\.reviews from public, anon, authenticated/i)
  assert.doesNotMatch(migration, /grant (insert|update|delete)[^;]*public\.reviews/i)
  assert.match(migration, /where r\.product_id = p_product_id and not r\.is_hidden/i)
  assert.match(migration, /not r\.is_hidden and r\.deleted_at is null/i)
  assert.match(migration, /order by \(auth\.uid\(\) is not null and r\.user_id = auth\.uid\(\)\) desc/i)
  const publicFunction = migration.match(/create or replace function public\.get_public_product_reviews[\s\S]*?\$function\$;/i)?.[0] || ''
  for (const privateField of ['recipient_name', 'recipient_phone', 'address_detail', 'order_item_id']) {
    assert.doesNotMatch(publicFunction, new RegExp(`\\b${privateField}\\b`, 'i'))
  }
  assert.doesNotMatch(publicFunction, /r\.user_id\s*(,|as\s+user_id)/i)
  assert.match(migration, /not public\.is_admin\(\)/i)
  assert.match(migration, /set is_hidden = p_hidden/i)
})

test('UI presents one review list, labels verified purchases, and prices the selected coupon rate', () => {
  assert.match(productReviews, /후기 \{combinedCount\}개/)
  assert.doesNotMatch(productReviews, /샘플 후기/)
  assert.match(productReviews, /id="review-list"/)
  assert.match(productReviews, /verified-review-badge[^>]*>구매 확인/)
  assert.match(productReviews, /후기를 불러오지 못했습니다/)
  assert.match(reviewModal, /trimmedLength >= 20 && trimmedLength <= 1000/)
  assert.match(reviewModal, /onCancel=.*attemptClose/)
  assert.match(checkout, /selectedCoupon\.coupons\?\.percent/)
  assert.doesNotMatch(checkout, /cartTotal \* 20 \/ 100/)
})
