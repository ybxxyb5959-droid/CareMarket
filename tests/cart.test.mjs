import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateCartPricing, createCartController } from '../src/lib/cart.js'

const deferred = () => {
  let resolve
  const promise = new Promise(r => { resolve = r })
  return { promise, resolve }
}

test('cart pricing applies the shared 3,000 won / 40,000 won delivery policy', () => {
  const item = (price, quantity) => ({ product: { price }, quantity })

  assert.deepEqual(calculateCartPricing([]), {
    productTotal: 0,
    deliveryFee: 0,
    paymentTotal: 0,
    freeDeliveryRemaining: 40000,
  })
  assert.deepEqual(calculateCartPricing([item(19900, 2)]), {
    productTotal: 39800,
    deliveryFee: 3000,
    paymentTotal: 42800,
    freeDeliveryRemaining: 200,
  })
  assert.deepEqual(calculateCartPricing([item(20000, 2)]), {
    productTotal: 40000,
    deliveryFee: 0,
    paymentTotal: 40000,
    freeDeliveryRemaining: 0,
  })
})

function fixture() {
  const rows = []
  const calls = []
  let heldRead = null
  let heldWrite = null
  let writeError = null
  const client = {
    from() {
      const query = {
        operation: 'read', filters: {},
        select() { return this },
        delete() { this.operation = 'delete'; return this },
        eq(key, value) { this.filters[key] = value; return this },
        order() { return this },
        async then(resolve, reject) {
          try {
            const { operation, filters } = this
            calls.push({ operation, ...filters })
            const data = rows.filter(row => Object.entries(filters).every(([k, v]) => row[k] === v)).map(r => ({ ...r }))
            if (operation === 'delete') {
              for (const row of data) rows.splice(rows.findIndex(r => r.cart_item_id === row.cart_item_id), 1)
            }
            if (heldRead && operation === 'read') { const wait = heldRead; heldRead = null; await wait.promise }
            resolve({ data, error: null })
          } catch (error) { reject(error) }
        },
      }
      return query
    },
    async rpc(operation, args) {
      calls.push({ operation, ...args })
      if (heldWrite) { const wait = heldWrite; heldWrite = null; await wait.promise }
      if (writeError) return { error: writeError }
      let row = rows.find(r => r.user_id === args.p_user_id && r.product_id === args.p_product_id)
      if (operation === 'add_my_cart_item') {
        if (row) row.quantity += args.p_quantity
        else rows.push({ cart_item_id: `${args.p_user_id}-${args.p_product_id}`, user_id: args.p_user_id, product_id: args.p_product_id, quantity: args.p_quantity })
      } else if (row) row.quantity = Math.max(1, row.quantity + args.p_delta)
      else return { error: new Error('missing cart item') }
      return { error: null }
    },
  }
  let state
  const errors = []
  const controller = createCartController(client, next => { state = next }, error => errors.push(error))
  return {
    controller, client, rows, calls, errors, state: () => state,
    holdRead: () => (heldRead = deferred()), holdWrite: () => (heldWrite = deferred()),
    failWrite: () => { writeError = new Error('network failure') },
  }
}

test('anonymous cart never sends reads or writes', async () => {
  const f = fixture()
  assert.equal(await f.controller.load(), false)
  assert.equal(await f.controller.add(1), false)
  assert.equal(await f.controller.changeQuantity(1, 1), false)
  assert.equal(await f.controller.remove(1), false)
  assert.equal(f.calls.length, 0)
})

test('queued adds, deltas, minimum one, delete and refresh persistence', async () => {
  const f = fixture()
  f.controller.setOwner('A')
  await f.controller.load()
  assert((await Promise.all(Array.from({ length: 12 }, () => f.controller.add(1)))).every(Boolean))
  assert.equal(f.rows.length, 1)
  assert.equal(f.state().rows[0].quantity, 12)
  await f.controller.changeQuantity(1, 1)
  await f.controller.changeQuantity(1, -1)
  assert.equal(f.state().rows[0].quantity, 12)
  let restored
  const fresh = createCartController(f.client, state => { restored = state }, () => {})
  fresh.setOwner('A')
  await fresh.load()
  assert.equal(restored.rows[0].quantity, 12)
  for (let n = 0; n < 15; n++) await f.controller.changeQuantity(1, -1)
  assert.equal(f.state().rows[0].quantity, 1)
  await f.controller.remove(1)
  assert.equal(f.rows.length, 0)
  assert.equal(f.state().rows.length, 0)
  assert.equal(f.state().pending, 0)
})

test('logout clears immediately and stale A fetch cannot populate B', async () => {
  const f = fixture()
  f.controller.setOwner('A')
  await f.controller.add(1)
  const wait = f.holdRead()
  const oldRead = f.controller.load()
  await new Promise(setImmediate)
  f.controller.setOwner(null)
  assert.deepEqual(f.state().rows, [])
  f.controller.setOwner('B')
  await f.controller.add(2)
  wait.resolve()
  await oldRead
  assert.deepEqual(f.state().rows.map(r => r.product_id), [2])
  assert.equal(f.state().ownerId, 'B')
})

test('old queued writes are discarded and in-flight result cannot reopen A cart', async () => {
  const f = fixture()
  f.controller.setOwner('A')
  const wait = f.holdWrite()
  const first = f.controller.add(1)
  const queued = f.controller.add(2)
  await new Promise(setImmediate)
  f.controller.setOwner(null)
  f.controller.setOwner('B')
  await f.controller.add(3)
  wait.resolve()
  assert.equal(await first, false)
  assert.equal(await queued, false)
  assert(!f.calls.some(c => c.p_user_id === 'A' && c.p_product_id === 2))
  assert.deepEqual(f.state().rows.map(r => r.product_id), [3])
})

test('same account after re-login also rejects the previous generation', async () => {
  const f = fixture()
  f.controller.setOwner('A')
  const wait = f.holdRead()
  const oldRead = f.controller.load()
  await new Promise(setImmediate)
  f.controller.setOwner(null)
  f.controller.setOwner('A')
  await f.controller.add(2)
  wait.resolve()
  assert.equal(await oldRead, false)
  assert.equal(f.state().rows[0].quantity, 1)
})

test('failed writes report errors without optimistic or mock cart data', async (t) => {
  t.mock.method(console, 'error', () => {})
  const f = fixture()
  f.controller.setOwner('A')
  await f.controller.load()
  f.failWrite()
  assert.equal(await f.controller.add(1), false)
  assert.equal(f.rows.length, 0)
  assert.deepEqual(f.state().rows, [])
  assert.equal(f.errors.length, 1)
  assert.equal(f.state().pending, 0)
})
