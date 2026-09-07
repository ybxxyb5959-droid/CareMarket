import assert from 'node:assert/strict'
import test from 'node:test'
import { getGoalNutrientLabel } from '../src/lib/cart-nutrient-label.js'

const supplement = mainIngredients => ({ name: '테스트 영양제', category: '영양제·비타민', mainIngredients })
test('supplement search shows food calories while other goals keep their nutrients', () => {
  const food = { category: '도시락·간편식', nutrition: { calories: 250, protein: 20, sodium: 100 } }
  assert.equal(getGoalNutrientLabel('영양제 탐색', food), '250kcal')
  assert.equal(getGoalNutrientLabel('근육량 증가', food), '단백질 20g')
  assert.equal(getGoalNutrientLabel('식단 영양 관리', food), '나트륨 100mg')
  assert.equal(getGoalNutrientLabel('영양제 탐색', { ...food, nutrition: { calories: null } }), null)
  assert.equal(getGoalNutrientLabel('영양제 탐색', { ...food, nutritionAvailability: { calories: false } }), null)
})
test('supplements show largest measured ingredient name with mass unit conversion', () => {
  for (const goal of ['영양제 탐색', '체중 관리', '근육량 증가']) {
    assert.equal(getGoalNutrientLabel(goal, supplement(['비타민A 52mg', '마그네슘 100mg'])), '마그네슘')
    assert.equal(getGoalNutrientLabel(goal, supplement(['비타민D 500μg', '마그네슘 100mg', '칼슘 0.2g'])), '칼슘')
    assert.equal(getGoalNutrientLabel(goal, supplement(['비타민D 4000IU', '마그네슘 100mg', '아르기닌 1,000mg'])), '아르기닌')
  }
  assert.equal(getGoalNutrientLabel('영양제 탐색', supplement(['유산균 100억'])), '유산균')
  assert.equal(getGoalNutrientLabel('영양제 탐색', supplement(['마그네슘'])), null)
})
