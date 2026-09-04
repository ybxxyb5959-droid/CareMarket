import test from 'node:test'
import assert from 'node:assert/strict'
import { createConfirmPaymentHandler } from '../supabase/functions/confirm-payment/handler.js'

const USER_ID = '11111111-1111-4111-8111-111111111111'
const ORDER_ID = 'cm_1234567890abcdef1234567890abcdef'
const PAYMENT_KEY = 'test-payment-key'

function request(body, origin = 'http://localhost:5175') {
  return new Request('https://example.test/confirm-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer test-token', origin },
    body: JSON.stringify(body),
  })
}

function order(overrides = {}) {
  return {
    order_id: '22222222-2222-4222-8222-222222222222',
    user_id: USER_ID,
    toss_order_id: ORDER_ID,
    payment_key: null,
    total_price: 28900,
    status: 'pending',
    ...overrides,
  }
}

function dependencies(overrides = {}) {
  return {
    getSecret: () => 'test_sk_fake_for_automated_tests',
    getUser: async () => ({ id: USER_ID }),
    findOrder: async () => order(),
    completeOrder: async () => ({ status: 'paid', total_price: 28900, already_paid: false }),
    fetchImpl: async (_url, options) => {
      const body = JSON.parse(options.body)
      return Response.json({ ...body, totalAmount: body.amount, status: 'DONE' })
    },
    logger: { info() {}, error() {} },
    ...overrides,
  }
}

const validBody = { paymentKey: PAYMENT_KEY, orderId: ORDER_ID, amount: 28900 }

test('allows dynamic localhost preflight and rejects external origins', async () => {
  const handler = createConfirmPaymentHandler(dependencies())
  const preflight = await handler(new Request('https://example.test', {
    method: 'OPTIONS', headers: { origin: 'http://localhost:5199' },
  }))
  assert.equal(preflight.status, 204)
  assert.equal(preflight.headers.get('Access-Control-Allow-Origin'), 'http://localhost:5199')

  const denied = await handler(request(validBody, 'https://untrusted.example'))
  assert.equal(denied.status, 403)
})

test('blocks a manipulated amount before calling Toss', async () => {
  let tossCalls = 0
  const handler = createConfirmPaymentHandler(dependencies({
    fetchImpl: async () => { tossCalls += 1; return Response.json({}) },
  }))
  const response = await handler(request({ ...validBody, amount: 100 }))
  assert.equal(response.status, 400)
  assert.equal((await response.json()).code, 'AMOUNT_MISMATCH')
  assert.equal(tossCalls, 0)
})

test('confirms once with an idempotency key and completes the DB transaction', async () => {
  let completed = 0
  let confirmHeader
  const handler = createConfirmPaymentHandler(dependencies({
    fetchImpl: async (_url, options) => {
      confirmHeader = options.headers['Idempotency-Key']
      return Response.json({ paymentKey: PAYMENT_KEY, orderId: ORDER_ID, totalAmount: 28900, status: 'DONE' })
    },
    completeOrder: async () => {
      completed += 1
      return { status: 'paid', total_price: 28900, already_paid: false }
    },
  }))
  const response = await handler(request(validBody))
  const body = await response.json()
  assert.equal(response.status, 200)
  assert.equal(body.code, 'PAYMENT_CONFIRMED')
  assert.equal(body.totalPrice, 28900)
  assert.equal(completed, 1)
  assert.equal(confirmHeader, `confirm-${ORDER_ID}`)
})

test('returns an already-paid order without calling Toss or decrementing stock again', async () => {
  let calls = 0
  const handler = createConfirmPaymentHandler(dependencies({
    findOrder: async () => order({ status: 'paid', payment_key: PAYMENT_KEY }),
    fetchImpl: async () => { calls += 1; return Response.json({}) },
    completeOrder: async () => { calls += 1 },
  }))
  const response = await handler(request(validBody))
  const body = await response.json()
  assert.equal(response.status, 200)
  assert.equal(body.alreadyConfirmed, true)
  assert.equal(calls, 0)
})

test('does not mark non-DONE payments as paid', async () => {
  let completed = 0
  const handler = createConfirmPaymentHandler(dependencies({
    fetchImpl: async () => Response.json({ paymentKey: PAYMENT_KEY, orderId: ORDER_ID, totalAmount: 28900, status: 'WAITING_FOR_DEPOSIT' }),
    completeOrder: async () => { completed += 1 },
  }))
  const response = await handler(request(validBody))
  assert.equal(response.status, 202)
  assert.equal((await response.json()).code, 'PAYMENT_PENDING')
  assert.equal(completed, 0)
})

test('automatically cancels a deterministic stock failure with a separate idempotency key', async () => {
  const calls = []
  const handler = createConfirmPaymentHandler(dependencies({
    fetchImpl: async (url, options) => {
      calls.push({ url, key: options.headers['Idempotency-Key'] })
      if (url.endsWith('/confirm')) {
        return Response.json({ paymentKey: PAYMENT_KEY, orderId: ORDER_ID, totalAmount: 28900, status: 'DONE' })
      }
      return Response.json({ status: 'CANCELED' })
    },
    completeOrder: async () => { throw new Error('CHECKOUT_STOCK_UNAVAILABLE') },
  }))
  const response = await handler(request(validBody))
  assert.equal(response.status, 409)
  assert.equal((await response.json()).code, 'PAYMENT_CANCELED_AFTER_ORDER_FAILURE')
  assert.equal(calls.length, 2)
  assert.equal(calls[1].key, `cancel-${ORDER_ID}`)
})
