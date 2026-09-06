const OAUTH_PROVIDERS = ['google', 'kakao']

export async function startOAuthLogin(client, origin, provider) {
  if (!OAUTH_PROVIDERS.includes(provider)) throw new Error('Unsupported OAuth provider')
  const { data, error } = await client.auth.signInWithOAuth({
    provider,
    options: { redirectTo: origin },
  })
  if (error) throw error
  if (!data?.url) throw new Error('OAuth redirect missing')
}

export const startGoogleLogin = (client, origin) => startOAuthLogin(client, origin, 'google')

export function isOAuthAccount(authUser) {
  return OAUTH_PROVIDERS.some(provider => authUser?.app_metadata?.provider === provider
    || authUser?.app_metadata?.providers?.includes(provider))
}

export function oauthDisplayName(authUser) {
  // Supabase Kakao maps nickname to name/full_name (provider/kakao.go).
  const metadata = authUser?.user_metadata || {}
  return [metadata.display_name, metadata.name, metadata.full_name,
    authUser?.email?.split('@')[0]].find(value => typeof value === 'string' && value.trim())?.trim()
    || 'CareMarket 회원'
}

export function isGoogleAccount(authUser) {
  return authUser?.app_metadata?.provider === 'google'
    || Boolean(authUser?.app_metadata?.providers?.includes('google'))
}

export function needsGoogleRegistration(profile) {
  return !profile?.phone?.trim() || !profile?.address?.trim()
    || !profile?.terms_agreed_at || !profile?.privacy_agreed_at
}

export async function completeGoogleProfile(client, fields) {
  if (!fields.termsAgreed || !fields.privacyAgreed
    || !fields.displayName?.trim() || !fields.phone?.trim() || !fields.address?.trim()) {
    throw new Error('이름, 전화번호, 주소와 필수 약관 동의를 확인해 주세요.')
  }
  const { error } = await client.rpc('complete_google_registration', {
    p_display_name: fields.displayName.trim(),
    p_phone: fields.phone.trim(),
    p_postal_code: fields.postalCode?.trim() || null,
    p_address: fields.address.trim(),
    p_address_detail: fields.addressDetail?.trim() || null,
    p_terms_agreed: fields.termsAgreed,
    p_privacy_agreed: fields.privacyAgreed,
    p_marketing_agreed: Boolean(fields.marketingAgreed),
  })
  if (error) throw error
}
