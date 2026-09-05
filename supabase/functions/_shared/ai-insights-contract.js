export const AI_INSIGHT_MODES = ['compare', 'cart_summary']
export const COMPARE_PRODUCT_MIN = 2
export const COMPARE_PRODUCT_MAX = 3

const textField = (maxLength) => ({ type: 'string', minLength: 1, maxLength })

export const GEMINI_COMPARE_SCHEMA = {
  type: 'object',
  properties: {
    summary: textField(180),
    highlights: {
      type: 'array',
      minItems: COMPARE_PRODUCT_MIN,
      maxItems: COMPARE_PRODUCT_MAX,
      items: {
        type: 'object',
        properties: {
          product_id: { type: 'integer', minimum: 1 },
          reason: textField(140),
        },
        required: ['product_id', 'reason'],
        additionalProperties: false,
      },
    },
    goal_fit_summary: textField(180),
    recommendation: {
      type: 'object',
      properties: {
        product_id: { type: 'integer', minimum: 1 },
        reason: textField(140),
      },
      required: ['product_id', 'reason'],
      additionalProperties: false,
    },
  },
  required: ['summary', 'highlights', 'goal_fit_summary', 'recommendation'],
  additionalProperties: false,
}

export const GEMINI_CART_SCHEMA = {
  type: 'object',
  properties: {
    headline: textField(90),
    summary: textField(180),
    actions: {
      type: 'array',
      minItems: 1,
      maxItems: 2,
      items: textField(140),
    },
  },
  required: ['headline', 'summary', 'actions'],
  additionalProperties: false,
}

export function validateInsightInput(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body) || !AI_INSIGHT_MODES.includes(body.mode)) {
    return { error: 'INVALID_INPUT' }
  }

  if (body.mode === 'cart_summary') {
    return Object.keys(body).every((key) => key === 'mode')
      ? { mode: body.mode }
      : { error: 'INVALID_INPUT' }
  }

  if (!Object.keys(body).every((key) => key === 'mode' || key === 'product_ids')
    || !Array.isArray(body.product_ids)
    || body.product_ids.length < COMPARE_PRODUCT_MIN
    || body.product_ids.length > COMPARE_PRODUCT_MAX) return { error: 'INVALID_INPUT' }

  const productIds = [...new Set(body.product_ids)]
  if (productIds.length !== body.product_ids.length
    || !productIds.every((id) => Number.isSafeInteger(id) && id > 0)) return { error: 'INVALID_INPUT' }

  return { mode: body.mode, productIds }
}
