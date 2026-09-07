import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { startGoogleLogin, startOAuthLogin, isGoogleAccount, isOAuthAccount, oauthDisplayName, needsGoogleRegistration, completeGoogleProfile } from '../src/lib/google-auth.js'

test('Google OAuth returns to the active localhost or deployed origin', async () => {
  for (const origin of ['http://localhost:5173', 'https://caremarket.example']) {
    const client = { auth: { signInWithOAuth: async options => {
      assert.deepEqual(options, { provider: 'google', options: { redirectTo: origin } })
      return { data: { url: 'https://accounts.google.com/' }, error: null }
    } } }
    await startGoogleLogin(client, origin)
  }
})

test('OAuth failures are propagated for the existing toast, including rejected network calls', async () => {
  for (const fn of [async () => ({ error: new Error('denied') }), async () => { throw new Error('offline') }, async () => ({ data: {} })]) {
    await assert.rejects(startGoogleLogin({ auth: { signInWithOAuth: fn } }, 'https://caremarket.example'))
  }
})

test('Google detection uses trusted app metadata, including linked identities', () => {
  assert.equal(isGoogleAccount({ app_metadata: { provider: 'google' } }), true)
  assert.equal(isGoogleAccount({ app_metadata: { provider: 'email', providers: ['email', 'google'] } }), true)
  assert.equal(isGoogleAccount({ user_metadata: { provider: 'google' } }), false)
  assert.equal(isGoogleAccount(null), false)
})

test('Kakao uses the same OAuth request and origin; unimplemented providers are rejected', async () => {
  let calls = 0
  const client = { auth: { signInWithOAuth: async options => {
    calls++
    assert.deepEqual(options, { provider: 'kakao', options: { redirectTo: 'http://localhost:5173' } })
    return { data: { url: 'https://kauth.kakao.com/' }, error: null }
  } } }
  await startOAuthLogin(client, 'http://localhost:5173', 'kakao')
  await assert.rejects(startOAuthLogin(client, 'http://localhost:5173', 'naver'))
  assert.equal(calls, 1)
})

test('Kakao with no email supports onboarding, a nickname and a safe display-name fallback', async () => {
  const kakao = { email: null, app_metadata: { provider: 'kakao' }, user_metadata: { name: '카카오 회원' } }
  assert.equal(isOAuthAccount(kakao), true)
  assert.equal(oauthDisplayName(kakao), '카카오 회원')
  assert.equal(oauthDisplayName({ email: null }), 'CareMarket 회원')
  assert.equal(isOAuthAccount({ user_metadata: { provider: 'kakao' } }), false)
  assert.equal(isOAuthAccount({ app_metadata: { providers: ['email', 'kakao'] } }), true)
  assert.equal(isOAuthAccount({ app_metadata: { provider: 'email' } }), false)
  const fields = { displayName: '회원', phone: '01012345678', address: '서울', termsAgreed: true, privacyAgreed: true }
  await completeGoogleProfile({ rpc: async (_, args) => {
    assert.equal(Object.keys(args).some(key => key.includes('email')), false)
    return { error: null }
  } }, fields)
  assert.equal(needsGoogleRegistration({ display_name: fields.displayName, phone: fields.phone, address: fields.address, terms_agreed_at: '2026-09-06', privacy_agreed_at: '2026-09-06' }), false)
})

test('new and interrupted Google signups require contact info and both agreements', () => {
  const complete = { display_name: '회원', phone: '01012345678', address: '서울', terms_agreed_at: '2026-09-06', privacy_agreed_at: '2026-09-06' }
  assert.equal(needsGoogleRegistration(null), true)
  assert.equal(needsGoogleRegistration(complete), false)
  for (const key of Object.keys(complete)) assert.equal(needsGoogleRegistration({ ...complete, [key]: '' }), true)
  assert.equal(needsGoogleRegistration({ ...complete, phone: '  ' }), true)
})

test('registration updates the existing profile through one RPC without auth or coupon inserts', async () => {
  const fields = { displayName: ' 테스트 ', phone: '01012345678', address: ' 서울 ', termsAgreed: true, privacyAgreed: true, marketingAgreed: false }
  let calls = 0
  const client = { rpc: async (name, args) => {
    calls++
    assert.equal(name, 'complete_google_registration')
    assert.equal(args.p_display_name, '테스트')
    assert.equal(args.p_address, '서울')
    assert.equal(args.p_marketing_agreed, false)
    return { error: null }
  } }
  await completeGoogleProfile(client, fields)
  assert.equal(calls, 1)
  for (const invalid of [{ termsAgreed: false }, { privacyAgreed: false }, { phone: ' ' }, { address: '' }]) {
    await assert.rejects(completeGoogleProfile(client, { ...fields, ...invalid }))
  }
  assert.equal(calls, 1)
  await assert.rejects(completeGoogleProfile({ rpc: async () => ({ error: new Error('not deployed') }) }, fields))
})

test('Supabase RPC errors preserve message, code and details for the caller', async () => {
  const error = { message: 'Supported OAuth account required', code: '42501', details: 'old RPC', hint: 'Apply migration' }
  await assert.rejects(completeGoogleProfile({ rpc: async () => ({ error }) }, {
    displayName: '회원', phone: '01012345678', address: '서울', termsAgreed: true, privacyAgreed: true,
  }), received => received === error)
})

test('profile restoration routes interrupted OAuth users back to completion and completed users home', async () => {
  // Execute the actual loader with persisted DB fixtures, including fresh sessions.
  const source = readFileSync(new URL('../src/StoreProvider.jsx', import.meta.url), 'utf8')
  const body = source.match(/const loadWellnessSettings = async \(\) => \{([\s\S]*?)\n    \}\n\n    loadWellnessSettings/)[1]
  const complete = { display_name: '회원', role: 'user', phone: '01012345678', address: '서울', terms_agreed_at: '2026-09-06', privacy_agreed_at: '2026-09-06' }
  for (const provider of ['kakao', 'google', 'email']) {
    for (const row of [null, { ...complete, phone: null }, { ...complete, display_name: ' ' }, complete]) {
      for (const initialView of ['main', 'register', 'login']) {
        let route = initialView
        const state = {}
        const scope = {
          mounted: true, authUserId: 'existing-auth-user', user: { oauth: provider !== 'email' },
          supabase: { from: table => ({ select: () => ({ eq: (column, id) => {
            assert.equal(column, 'user_id')
            assert.equal(id, 'existing-auth-user')
            return { maybeSingle: async () => ({ data: table === 'profiles' ? row : null, error: null }) }
          } }) }) },
          window: { location: { pathname: '/' }, history: { state: {}, replaceState: next => { route = next.view } } },
          DB_TO_GOAL: {}, toPreferenceState: () => ({ subFilters: [], allergies: [] }),
          needsGoogleRegistration, parseAppLocation: () => ({ view: route }), viewUrl: view => `/${view}`,
          scrollTop: () => {}, showToast: () => {},
        }
        for (const [, setter] of body.matchAll(/\b(set\w+)\(/g)) scope[setter] = value => { state[setter] = value }
        await new Function(...Object.keys(scope), `return (async () => {${body}})()`)(...Object.values(scope))
        if (provider !== 'email') {
          assert.equal(state.setOauthRegistrationRequired, needsGoogleRegistration(row))
          assert.equal(route, needsGoogleRegistration(row) ? 'register' : 'main')
        } else {
          assert.equal(state.setOauthRegistrationRequired, undefined)
          assert.equal(route, initialView === 'register' ? 'register' : 'custom')
        }
        assert.equal(state.setProfileLoading, false)
      }
    }
  }
})
