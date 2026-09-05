import { createClient } from 'npm:@supabase/supabase-js@2'
import { createAiInsightsHandler } from './handler.js'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const productionOrigins = (Deno.env.get('AI_INSIGHTS_ALLOWED_ORIGINS') || Deno.env.get('AI_SEARCH_ALLOWED_ORIGINS') || '')
  .split(',').map((origin) => origin.trim()).filter(Boolean)
const productColumns = 'product_id,name,category,price,calories,protein,carbs,fat,sugar,sodium,allergens,contains_caffeine'

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

Deno.serve(createAiInsightsHandler({
  getApiKey: () => Deno.env.get('GEMINI_API_KEY'),
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
  getProfile: async (userId) => {
    const { data, error } = await admin.from('profiles').select('primary_goal').eq('user_id', userId).maybeSingle()
    if (error) throw error
    return data
  },
  getProducts: async (productIds) => {
    const { data, error } = await admin.from('products').select(productColumns)
      .in('product_id', productIds).eq('is_active', true)
    if (error) throw error
    return data || []
  },
  getCartSnapshot: async (userId) => {
    const [profileResult, preferencesResult, cartResult] = await Promise.all([
      admin.from('profiles').select('primary_goal').eq('user_id', userId).maybeSingle(),
      admin.from('user_preferences')
        .select('low_sugar,low_sodium,high_protein,exclude_caffeine,excluded_allergens')
        .eq('user_id', userId).maybeSingle(),
      admin.from('cart_items').select(`quantity,product:products(${productColumns})`)
        .eq('user_id', userId).order('created_at', { ascending: true }).limit(51),
    ])
    if (profileResult.error) throw profileResult.error
    if (preferencesResult.error) throw preferencesResult.error
    if (cartResult.error) throw cartResult.error
    return { profile: profileResult.data, preferences: preferencesResult.data, items: cartResult.data || [] }
  },
}))
