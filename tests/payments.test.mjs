import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {
  checkoutRequestErrorMessage,
  createCheckoutOrder,
  isCheckoutShippingComplete,
  memberCheckoutShipping,
  normalizeCheckoutShipping,
  shippingForMemberToggle,
} from '../src/lib/payments.js'

const checkoutSource = fs.readFileSync(new URL('../src/pages/Checkout.jsx', import.meta.url), 'utf8')
const checkoutSummarySource = fs.readFileSync(new URL('../src/components/checkout/CheckoutSummary.jsx', import.meta.url), 'utf8')

const validShipping = {
  name: '김케어',
  phone: '010-1234-5678',
  postalCode: '06236',
  address: '서울특별시 강남구 테헤란로 1',
  addressDetail: '101호',
  deliveryRequest: '문 앞에 놓아주세요',
}

test('checkout defaults to member shipping and clears member fields when unchecked', () => {
  const member = memberCheckoutShipping(
    { name: '김케어' },
    { phone: '010-1234-5678', postalCode: '06236', address: '서울시 강남구', addressDetail: '101호' },
  )
  assert.deepEqual(member, {
    name: '김케어',
    phone: '010-1234-5678',
    postalCode: '06236',
    address: '서울시 강남구',
    addressDetail: '101호',
    deliveryRequest: '',
  })

  const cleared = shippingForMemberToggle({ ...member, deliveryRequest: '문 앞' }, member, false)
  assert.deepEqual(cleared, {
    name: '', phone: '', postalCode: '', address: '', addressDetail: '', deliveryRequest: '문 앞',
  })
  assert.deepEqual(shippingForMemberToggle(cleared, member, true), {
    ...member, deliveryRequest: '문 앞',
  })
  assert.equal(isCheckoutShippingComplete(member), true)
  assert.equal(isCheckoutShippingComplete({ ...member, postalCode: '' }), false)
})

test('checkout keeps the Toss widget mounted during background cart refresh', () => {
  assert.match(checkoutSource, /cart\.length === 0 && \(cartLoading \|\| cartError\)/)
  assert.doesNotMatch(checkoutSource, /<form[^>]+checkout-form/)
  assert.doesNotMatch(checkoutSummarySource, /type="submit"|form="checkout-form"/)
  assert.match(checkoutSummarySource, /type="button"[^>]+onClick=\{onPay\}/)
})

test('checkout explains actionable Toss widget errors without forcing a cart reload', () => {
  assert.equal(checkoutRequestErrorMessage({ code: 'NOT_SELECTED_PAYMENT_METHOD' }), '결제수단을 선택해 주세요.')
  assert.equal(checkoutRequestErrorMessage({ code: 'NEED_AGREEMENT_WITH_REQUIRED_TERMS' }), '필수 결제 약관에 동의해 주세요.')
  assert.match(checkoutRequestErrorMessage({ name: 'UnsupportedTestPhasePaymentMethodError' }), /테스트 환경/)
  const paymentCatch = checkoutSource.match(/catch \(error\) \{[\s\S]*?\n    \} finally/)
  assert.ok(paymentCatch)
  assert.doesNotMatch(paymentCatch[0], /reloadCart/)
})

test('checkout sends the validated shipping snapshot to the order RPC', async () => {
  let call
  const client = {
    async rpc(name, params) {
      call = { name, params }
      return { data: { order_id: 'order-id', toss_order_id: 'toss-id', order_name: '상품', total_price: 43000 }, error: null }
    },
  }

  const order = await createCheckoutOrder(client, validShipping)
  assert.equal(order.total_price, 43000)
  assert.deepEqual(call, {
    name: 'create_checkout_order',
    params: {
      p_recipient_name: '김케어',
      p_recipient_phone: '010-1234-5678',
      p_postal_code: '06236',
      p_address: '서울특별시 강남구 테헤란로 1',
      p_address_detail: '101호',
      p_delivery_request: '문 앞에 놓아주세요',
    },
  })
})

test('checkout falls back only when the remote shipping RPC signature is not deployed', async () => {
  const calls = []
  const order = { order_id: 'order-id', toss_order_id: 'toss-id', order_name: '상품', total_price: 43000 }
  const client = {
    async rpc(name, params) {
      calls.push({ name, params })
      if (calls.length === 1) return { data: null, error: { code: 'PGRST202' } }
      return { data: order, error: null }
    },
  }

  assert.deepEqual(await createCheckoutOrder(client, validShipping), order)
  assert.equal(calls.length, 2)
  assert.equal(calls[0].name, 'create_checkout_order')
  assert.equal(calls[1].name, 'create_checkout_order')
  assert.equal(calls[1].params, undefined)

  let attempts = 0
  const failingClient = {
    async rpc() {
      attempts += 1
      return { data: null, error: { code: '42501', message: 'permission denied' } }
    },
  }
  await assert.rejects(createCheckoutOrder(failingClient, validShipping), (error) => error?.code === '42501')
  assert.equal(attempts, 1)
})

test('checkout rejects missing required shipping before creating an order', async () => {
  let calls = 0
  const client = { async rpc() { calls += 1; return { data: null, error: null } } }
  await assert.rejects(createCheckoutOrder(client, { ...validShipping, address: '' }), /INVALID_ADDRESS/)
  await assert.rejects(createCheckoutOrder(client, { ...validShipping, phone: '' }), /INVALID_RECIPIENT_PHONE/)
  assert.equal(calls, 0)
})

test('shipping normalization trims values and enforces snapshot length limits', () => {
  assert.equal(normalizeCheckoutShipping({ ...validShipping, name: '  김케어  ' }).recipientName, '김케어')
  assert.throws(() => normalizeCheckoutShipping({ ...validShipping, deliveryRequest: '가'.repeat(201) }), /INVALID_DELIVERY_REQUEST/)
})

test('shipping migration is additive and keeps owner-based order RLS enabled', () => {
  const sql = fs.readFileSync(new URL('../supabase/migrations/20260905000400_checkout_shipping_snapshot.sql', import.meta.url), 'utf8')
  for (const column of ['recipient_name', 'recipient_phone', 'postal_code', 'address', 'address_detail', 'delivery_request']) {
    assert.match(sql, new RegExp(`add column if not exists ${column} text`))
  }
  assert.match(sql, /revoke all on function public\.create_checkout_order\(\) from public, anon, authenticated/i)
  assert.match(sql, /grant execute on function public\.create_checkout_order\(text, text, text, text, text, text\)\s+to authenticated/i)
  assert.doesNotMatch(sql, /disable row level security|drop table|drop column/i)
})

test('existing signup metadata is backfilled without overwriting saved profile contact', () => {
  const sql = fs.readFileSync(new URL('../supabase/migrations/20260905000700_backfill_profile_contact_from_auth_metadata.sql', import.meta.url), 'utf8')
  assert.match(sql, /from auth\.users as auth_user/i)
  for (const field of ['phone', 'postal_code', 'address', 'address_detail']) {
    assert.match(sql, new RegExp(`profile\\.${field}`))
    assert.match(sql, new RegExp(`raw_user_meta_data ->> '${field}'`))
  }
  assert.match(sql, /coalesce\(/i)
  assert.doesNotMatch(sql, /delete from|drop table|drop column/i)
})
