import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

// Capture provider errors before Supabase consumes/cleans the callback URL.
export const oauthCallbackFailed = typeof window !== 'undefined' && (
  new URLSearchParams(window.location.hash.slice(1)).has('error')
    || new URLSearchParams(window.location.search).has('error')
)

export const supabase = createClient(supabaseUrl, supabasePublishableKey)
