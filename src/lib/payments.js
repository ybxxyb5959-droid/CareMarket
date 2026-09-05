export function normalizeCheckoutShipping(values = {}) {
  const shipping = {
    recipientName: String(values.recipientName || values.name || '').trim(),
    recipientPhone: String(values.recipientPhone || values.phone || '').trim(),
    postalCode: String(values.postalCode || '').trim(),
    address: String(values.address || '').trim(),
    addressDetail: String(values.addressDetail || '').trim(),
    deliveryRequest: String(values.deliveryRequest || '').trim(),
  }

  if (!shipping.recipientName || shipping.recipientName.length > 100) throw new Error('INVALID_RECIPIENT_NAME')
  if (shipping.recipientPhone.length < 5 || shipping.recipientPhone.length > 30) throw new Error('INVALID_RECIPIENT_PHONE')
  if (shipping.postalCode.length > 20) throw new Error('INVALID_POSTAL_CODE')
  if (!shipping.address || shipping.address.length > 300) throw new Error('INVALID_ADDRESS')
  if (shipping.addressDetail.length > 200) throw new Error('INVALID_ADDRESS_DETAIL')
  if (shipping.deliveryRequest.length > 200) throw new Error('INVALID_DELIVERY_REQUEST')
  return shipping
}

export async function createCheckoutOrder(client, values) {
  const shipping = normalizeCheckoutShipping(values)
  const { data, error } = await client.rpc('create_checkout_order', {
    p_recipient_name: shipping.recipientName,
    p_recipient_phone: shipping.recipientPhone,
    p_postal_code: shipping.postalCode || null,
    p_address: shipping.address,
    p_address_detail: shipping.addressDetail || null,
    p_delivery_request: shipping.deliveryRequest || null,
  })
  if (error) throw error
  if (!data?.order_id || !data?.toss_order_id || !data?.order_name
    || !Number.isSafeInteger(data.total_price) || data.total_price <= 0) {
    throw new Error('INVALID_CHECKOUT_ORDER')
  }
  return data
}

export async function confirmPayment(client, params) {
  const { data, error } = await client.functions.invoke('confirm-payment', { body: params })
  if (error) {
    let code = 'PAYMENT_CONFIRM_FAILED'
    try {
      const body = await error.context?.json()
      if (typeof body?.code === 'string') code = body.code
    } catch {
      // Network and gateway errors may not include a JSON response.
    }
    throw new Error(code)
  }
  return data
}

export function paymentErrorMessage(code) {
  if (code === 'AMOUNT_MISMATCH') return '주문 금액이 일치하지 않습니다. 장바구니에서 다시 결제해 주세요.'
  if (code === 'PAYMENT_CANCELED_AFTER_ORDER_FAILURE') return '주문 처리 중 문제가 발생해 결제를 자동 취소했습니다. 장바구니를 확인해 주세요.'
  if (code === 'PAYMENT_RECONCILIATION_REQUIRED') return '결제 승인 후 주문 처리 상태를 확인하고 있습니다. 중복 결제하지 말고 잠시 후 다시 확인해 주세요.'
  if (code === 'PAYMENT_NOT_CONFIGURED') return '현재 결제를 준비 중입니다. 잠시 후 다시 시도해 주세요.'
  if (code === 'AUTH_REQUIRED' || code === 'AUTH_INVALID') return '로그인 상태를 확인한 뒤 다시 시도해 주세요.'
  return '결제 확인을 완료하지 못했습니다. 장바구니와 주문내역을 확인해 주세요.'
}
