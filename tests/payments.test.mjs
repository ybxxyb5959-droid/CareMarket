import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createCheckoutOrder, normalizeCheckoutShipping } from '../src/lib/payments.js'

const validShipping = {
  name: '김케어',
  phone: '010-1234-5678',
  postalCode: '06236',
  address: '서울특별시 강남구 테헤란로 1',
  addressDetail: '101호',
  deliveryRequest: '문 앞에 놓아주세요',
}

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
