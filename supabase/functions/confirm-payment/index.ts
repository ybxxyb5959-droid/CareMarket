import { createClient } from 'npm:@supabase/supabase-js@2'
import { createConfirmPaymentHandler } from './handler.js'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const productionOrigins = (Deno.env.get('PAYMENT_ALLOWED_ORIGINS') || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

Deno.serve(createConfirmPaymentHandler({
  getSecret: () => Deno.env.get('TOSS_SECRET_KEY'),
  productionOrigins,
  getUser: async (authorization) => {
    const client = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data, error } = await client.auth.getUser()
    if (error) throw error
    return data.user
  },
  findOrder: async (userId, tossOrderId) => {
    const { data, error } = await admin
      .from('orders')
      .select('order_id, user_id, toss_order_id, payment_key, total_price, status')
      .eq('user_id', userId)
      .eq('toss_order_id', tossOrderId)
      .maybeSingle()
    if (error) throw error
    return data
  },
  completeOrder: async (orderId, paymentKey) => {
    const { data, error } = await admin.rpc('complete_paid_order', {
      p_order_id: orderId,
      p_payment_key: paymentKey,
    })
    if (error) throw error
    return data
  },
}))
