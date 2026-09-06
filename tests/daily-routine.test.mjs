import test from 'node:test'
import assert from 'node:assert/strict'
import { getRoutineClock, getDailyRoutine, ROUTINE_SLOTS } from '../src/lib/daily-routine.js'

test('Korean midnight changes the day and all four time boundaries select their slot', () => {
  const before = getRoutineClock(new Date('2026-09-06T14:59:59Z'))
  const after = getRoutineClock(new Date('2026-09-06T15:00:00Z'))
  assert.equal(after.day, before.day + 1)
  assert.equal(after.dateKey, '2026-09-07')
  assert.equal(after.slotId, 'morning')
  for (const [time, slotId] of [['07:59', 'morning'], ['08:00', 'morning'], ['12:29', 'morning'], ['12:30', 'lunch'], ['15:59', 'lunch'], ['16:00', 'afternoon'], ['19:29', 'afternoon'], ['19:30', 'evening']]) {
    assert.equal(getRoutineClock(new Date(`2026-09-06T${time}:00+09:00`)).slotId, slotId)
  }
})

test('daily selection is stable, changes on adjacent dates and excludes unavailable/allergen products', () => {
  const products = ROUTINE_SLOTS.flatMap((slot, i) => [0, 1, 2].map(n => ({ id: i * 10 + n, category: slot.categories[0], stock: 5, allergens: [] })))
  const today = getDailyRoutine(products, 20000)
  assert.deepEqual(today, getDailyRoutine([...products].reverse(), 20000))
  const tomorrow = getDailyRoutine(products, 20001)
  today.forEach((slot, i) => { assert.notEqual(slot.product.id, tomorrow[i].product.id); assert.notEqual(slot.title, tomorrow[i].title) })
  assert.ok(getDailyRoutine(products.map(p => ({ ...p, stock: 0 })), 20000).every(slot => slot.product === null))
  assert.ok(getDailyRoutine(products.map(p => ({ ...p, isActive: false })), 20000).every(slot => slot.product === null))
  assert.ok(getDailyRoutine(products.map(p => ({ ...p, allergens: ['우유'] })), 20000, ['우유']).every(slot => slot.product === null))
  assert.ok(getDailyRoutine([], 20000).every(slot => slot.product === null))
})
