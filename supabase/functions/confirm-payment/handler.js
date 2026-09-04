const ALLOWED_HEADERS = 'authorization, x-client-info, apikey, content-type'
const ALLOWED_METHODS = 'POST, OPTIONS'

function isAllowedOrigin(origin, productionOrigins) {
  if (!origin) return true

  try {
    const url = new URL(origin)
    if (url.protocol === 'http:'
      && (url.hostname === 'localhost' || url.hostname === '127.0.0.1')
      && /^http:\/\/(?:localhost|127\.0\.0\.1)(?::[0-9]+)?$/.test(origin)
      && url.port !== '0') return true

    return url.protocol === 'https:'
      && url.origin === origin
      && productionOrigins.includes(origin)
  } catch {
    return false
  }
}

function corsHeaders(origin) {
  const headers = {
    'Access-Control-Allow-Headers': ALLOWED_HEADERS,
    'Access-Control-Allow-Methods': ALLOWED_METHODS,
    'Content-Type': 'application/json',
    'Vary': 'Origin',
  }
  if (origin) headers['Access-Control-Allow-Origin'] = origin
  return headers
}

function json(origin, status, body) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders(origin) })
}

async function readTossError(response) {
  try {
    const body = await response.json()
    return {
      code: typeof body?.code === 'string' ? body.code : 'UNKNOWN_TOSS_ERROR',
      status: typeof body?.status === 'string' ? body.status : null,
    }
  } catch {
    return { code: 'INVALID_TOSS_RESPONSE', status: null }
  }
}

function isValidInput(body) {
  return body
    && typeof body.paymentKey === 'string'
    && body.paymentKey.length > 0
    && body.paymentKey.length <= 200
    && typeof body.orderId === 'string'
    && /^[A-Za-z0-9_-]{6,64}$/.test(body.orderId)
    && Number.isSafeInteger(body.amount)
    && body.amount > 0
}

export function createConfirmPaymentHandler({
  getSecret,
  productionOrigins = [],
  getUser,
  findOrder,
  completeOrder,
  fetchImpl = fetch,
  logger = console,
}) {
  return async (request) => {
    const origin = request.headers.get('origin') || ''
    if (!isAllowedOrigin(origin, productionOrigins)) {
      return json('', 403, { code: 'ORIGIN_NOT_ALLOWED' })
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) })
    }

    if (request.method !== 'POST') return json(origin, 405, { code: 'METHOD_NOT_ALLOWED' })

    const authorization = request.headers.get('authorization')
    if (!authorization?.startsWith('Bearer ')) {
      return json(origin, 401, { code: 'AUTH_REQUIRED' })
    }

    let user
    try {
      user = await getUser(authorization)
    } catch (error) {
      logger.error('confirm-payment auth failed', { code: error?.code || 'AUTH_LOOKUP_FAILED' })
      return json(origin, 401, { code: 'AUTH_INVALID' })
    }

    if (!user?.id) return json(origin, 401, { code: 'AUTH_INVALID' })

    let body
    try {
      body = await request.json()
    } catch {
      return json(origin, 400, { code: 'INVALID_JSON' })
    }

    if (!isValidInput(body)) return json(origin, 400, { code: 'INVALID_PAYMENT_INPUT' })

    const secretKey = getSecret()
    if (!secretKey || !secretKey.startsWith('test_')) {
      logger.error('confirm-payment secret is missing or is not a TEST key')
      return json(origin, 503, { code: 'PAYMENT_NOT_CONFIGURED' })
    }

    let order
    try {
      order = await findOrder(user.id, body.orderId)
    } catch (error) {
      logger.error('confirm-payment order lookup failed', { code: error?.code || 'ORDER_LOOKUP_FAILED' })
      return json(origin, 500, { code: 'ORDER_LOOKUP_FAILED' })
    }

    if (!order
      || order.user_id !== user.id
      || order.toss_order_id !== body.orderId) {
      return json(origin, 404, { code: 'ORDER_NOT_FOUND' })
    }
    if (order.total_price !== body.amount) return json(origin, 400, { code: 'AMOUNT_MISMATCH' })

    if (order.status !== 'pending') {
      if (['paid', 'preparing', 'shipped', 'delivered'].includes(order.status)
        && order.payment_key === body.paymentKey) {
        return json(origin, 200, {
          code: 'PAYMENT_CONFIRMED',
          orderId: body.orderId,
          status: order.status,
          totalPrice: order.total_price,
          alreadyConfirmed: true,
        })
      }
      return json(origin, 409, { code: 'ORDER_NOT_PAYABLE' })
    }

    const basicAuthorization = `Basic ${btoa(`${secretKey}:`)}`
    let confirmResponse
    try {
      confirmResponse = await fetchImpl('https://api.tosspayments.com/v1/payments/confirm', {
        method: 'POST',
        headers: {
          'Authorization': basicAuthorization,
          'Content-Type': 'application/json',
          'Idempotency-Key': `confirm-${body.orderId}`,
        },
        body: JSON.stringify({
          paymentKey: body.paymentKey,
          orderId: body.orderId,
          amount: body.amount,
        }),
      })
    } catch (error) {
      logger.error('Toss confirm network failed', {
        code: error?.name || 'TOSS_NETWORK_FAILED',
        orderId: body.orderId,
      })
      return json(origin, 502, { code: 'TOSS_CONFIRM_FAILED' })
    }

    if (!confirmResponse.ok) {
      const tossError = await readTossError(confirmResponse)
      logger.error('Toss confirm failed', {
        upstreamStatus: confirmResponse.status,
        code: tossError.code,
        status: tossError.status,
        orderId: body.orderId,
      })
      return json(origin, 502, { code: 'TOSS_CONFIRM_FAILED' })
    }

    let payment
    try {
      payment = await confirmResponse.json()
    } catch {
      logger.error('Toss confirm returned invalid JSON', { upstreamStatus: confirmResponse.status, orderId: body.orderId })
      return json(origin, 502, { code: 'INVALID_TOSS_RESPONSE' })
    }

    if (payment?.orderId !== body.orderId
      || payment?.totalAmount !== body.amount
      || payment?.paymentKey !== body.paymentKey) {
      logger.error('Toss confirm response mismatch', { orderId: body.orderId })
      return json(origin, 502, { code: 'TOSS_RESPONSE_MISMATCH' })
    }

    logger.info('Toss confirm completed', {
      upstreamStatus: confirmResponse.status,
      paymentStatus: payment.status,
      orderId: body.orderId,
    })

    if (payment.status !== 'DONE') {
      return json(origin, 202, {
        code: 'PAYMENT_PENDING',
        orderId: body.orderId,
        status: payment.status || 'UNKNOWN',
      })
    }

    try {
      const completed = await completeOrder(order.order_id, body.paymentKey)
      return json(origin, 200, {
        code: 'PAYMENT_CONFIRMED',
        orderId: body.orderId,
        status: completed.status,
        totalPrice: completed.total_price,
        alreadyConfirmed: Boolean(completed.already_paid),
      })
    } catch (error) {
      logger.error('Paid order DB finalization failed', {
        code: error?.code || 'ORDER_FINALIZATION_FAILED',
        orderId: body.orderId,
      })

      try {
        const refreshed = await findOrder(user.id, body.orderId)
        if (refreshed
          && ['paid', 'preparing', 'shipped', 'delivered'].includes(refreshed.status)
          && refreshed.payment_key === body.paymentKey) {
          return json(origin, 200, {
            code: 'PAYMENT_CONFIRMED',
            orderId: body.orderId,
            status: refreshed.status,
            totalPrice: refreshed.total_price,
            alreadyConfirmed: true,
          })
        }
      } catch (lookupError) {
        logger.error('Order reconciliation lookup failed', {
          code: lookupError?.code || 'ORDER_RECONCILIATION_FAILED',
          orderId: body.orderId,
        })
      }

      const deterministicFailure = error?.message === 'CHECKOUT_PRODUCT_UNAVAILABLE'
        || error?.message === 'CHECKOUT_STOCK_UNAVAILABLE'
        || error?.message === 'CHECKOUT_TOTAL_INTEGRITY_ERROR'

      if (deterministicFailure) {
        let cancelResponse
        try {
          cancelResponse = await fetchImpl(
            `https://api.tosspayments.com/v1/payments/${encodeURIComponent(body.paymentKey)}/cancel`,
            {
              method: 'POST',
              headers: {
                'Authorization': basicAuthorization,
                'Content-Type': 'application/json',
                'Idempotency-Key': `cancel-${body.orderId}`,
              },
              body: JSON.stringify({ cancelReason: '주문 처리 실패로 인한 자동 취소' }),
            },
          )
        } catch (cancelNetworkError) {
          logger.error('Toss compensation cancel network failed', {
            code: cancelNetworkError?.name || 'TOSS_CANCEL_NETWORK_FAILED',
            orderId: body.orderId,
          })
          return json(origin, 500, { code: 'PAYMENT_RECONCILIATION_REQUIRED' })
        }
        if (!cancelResponse.ok) {
          const cancelError = await readTossError(cancelResponse)
          logger.error('Toss compensation cancel failed', {
            upstreamStatus: cancelResponse.status,
            code: cancelError.code,
            status: cancelError.status,
            orderId: body.orderId,
          })
          return json(origin, 500, { code: 'PAYMENT_RECONCILIATION_REQUIRED' })
        }
        return json(origin, 409, { code: 'PAYMENT_CANCELED_AFTER_ORDER_FAILURE' })
      }

      return json(origin, 500, { code: 'PAYMENT_RECONCILIATION_REQUIRED' })
    }
  }
}

export { isAllowedOrigin }
