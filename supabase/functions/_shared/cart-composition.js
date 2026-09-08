import { HIGH_PROTEIN_MIN } from './nutrition-policy.js'

// Roles describe registered products, never a person's diet or nutrient intake.
export function analyzeCartComposition(rows) {
  const foods = rows.filter(row => !row.supplement)
  const products = foods.map(row => {
    const name = row.name.normalize('NFKC').toLowerCase()
    const category = String(row.category || '').normalize('NFKC').toLowerCase()
    const beverage = /음료|라떼|주스|쥬스/.test(name + ' ' + category)
    const condiment = /소스|조미료|드레싱/.test(category) || /소스|드레싱/.test(name)
    const highProtein = row.nutrition.protein !== null && row.nutrition.protein >= HIGH_PROTEIN_MIN
    // Mixed catalog categories (e.g. 음료·프로틴음료) do not prove a role.
    const proteinSource = highProtein || (!condiment && /닭가슴살|닭고기|스테이크|두부|계란|달걀|프로틴|단백질|연어|소고기|쇠고기/.test(name))
    const vegetable = !beverage && !condiment && (/샐러드|야채|채소/.test(name)
      || /^(채소|야채|샐러드)(류|·샐러드)?$/.test(category)
      || (/그린/.test(name) && /채소|야채|샐러드/.test(category)))
    const other = /도시락|간편식|시리얼|그래놀라|견과|건과류|유제품|대체유|간식|소스|조미료/.exec(category)?.[0]
    const family = beverage ? 'beverage' : vegetable ? 'vegetable' : proteinSource ? 'protein' : other || null
    return { id: row.id, name: row.name, category: row.category, nutrition: row.nutrition,
      mainIngredients: row.mainIngredients, allergens: row.allergens,
      roles: [proteinSource && 'protein', vegetable && 'vegetable', beverage && 'beverage'].filter(Boolean),
      highProtein, family }
  })
  const count = role => products.filter(p => p.roles.includes(role)).length
  const protein = count('protein'), vegetable = count('vegetable')
  const known = products.filter(p => p.family).length
  const families = products.reduce((all, p) => { if (p.family) all[p.family] = (all[p.family] || 0) + 1; return all }, {})
  let decision = 'limited'
  if (foods.length >= 2 && known === foods.length) {
    if (protein && vegetable) decision = 'protein_vegetable'
    else if (protein / foods.length > 0.5 && !vegetable) decision = 'protein_centered'
    else if (vegetable / foods.length > 0.5 && !protein) decision = 'vegetable_centered'
    else if (Object.keys(families).length >= 3 && Math.max(...Object.values(families)) / foods.length <= 0.5) decision = 'varied'
  }
  const summaries = {
    protein_centered: '단백질 중심으로 구성되어 있어요. 현재 장바구니에서는 채소류 상품이 확인되지 않아요.',
    protein_vegetable: '단백질원과 채소류가 함께 담겨 있어 현재 구성이 비교적 다양해요.',
    vegetable_centered: '채소류 중심으로 담겨 있어요. 현재 장바구니에서는 뚜렷한 단백질원 상품이 확인되지 않아요.',
    varied: '여러 유형의 상품이 함께 담겨 있어 현재 장바구니 구성이 비교적 다양해요.',
    limited: '등록된 상품 정보를 기준으로 전체 구성을 확인할 수 있는 범위가 제한적이에요.',
  }
  const highProteinProducts = products.filter(p => p.highProtein).length
  const missingProteinProducts = products.filter(p => p.nutrition.protein === null).length
  const proteinEvidence = highProteinProducts === foods.length ? `담은 일반 식품 ${foods.length}종 모두 등록된 단백질 수치가 고단백 기준에 해당합니다.`
    : `일반 식품 ${foods.length}종 중 고단백 기준에 해당하는 상품은 ${highProteinProducts}종입니다.`
  const evidence = foods.length ? `${proteinEvidence}${missingProteinProducts ? ` 단백질 정보가 없는 ${missingProteinProducts}종은 수치 판정을 보류했습니다.` : ''} 등록 영양정보와 상품명·카테고리를 함께 보면 단백질원 후보는 ${protein}종, 채소류 상품은 ${vegetable}종입니다.` : ''
  const attention = decision === 'protein_centered' ? '현재 구성은 단백질원 상품에 집중되어 있습니다. 다양한 상품 구성을 원한다면 샐러드·채소류 상품도 함께 살펴볼 수 있습니다.'
    : decision === 'vegetable_centered' ? '현재 장바구니에서는 뚜렷한 단백질원 상품이 확인되지 않습니다. 다양한 구성을 원한다면 단백질원 상품도 함께 살펴볼 수 있습니다.' : null
  const supplementProducts = rows.length - foods.length
  const shortSummary = summaries[decision] + (supplementProducts ? ` 보조 영양 상품 ${supplementProducts}종은 별도로 확인해요.` : '')
  return { decision, totalProducts: rows.length, foodProducts: foods.length, highProteinProducts,
    proteinSourceProducts: protein, vegetableTypeProducts: vegetable, beverageProducts: count('beverage'),
    supplementProducts, missingProteinProducts, unclassifiedProducts: foods.length - known, products,
    shortSummary, detailSummary: shortSummary + (evidence ? ' ' + evidence : ''), attention,
    goodPoint: ['protein_vegetable', 'varied'].includes(decision) ? summaries[decision] : null }
}
