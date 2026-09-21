import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const registerSource = fs.readFileSync(new URL('../src/pages/Register.jsx', import.meta.url), 'utf8')

test('signup blocks submission and shows guidance for missing/invalid name and phone', () => {
  assert.match(registerSource, /MOBILE_PHONE_RE = \/\^010\\d\{8\}\$\//)

  assert.match(registerSource, /if \(!form\.displayName\.trim\(\)\) return setNameError\('이름을 입력해주세요\.'\)/)
  assert.match(registerSource, /if \(!form\.phone\.trim\(\)\) return setPhoneError\('전화번호를 입력해주세요\.'\)/)
  assert.match(registerSource, /if \(!MOBILE_PHONE_RE\.test\(form\.phone\.trim\(\)\)\) return setPhoneError\('올바른 전화번호를 입력해주세요\.'\)/)

  // phone input strips non-digits as the user types
  assert.match(registerSource, /onChange=\{\(e\) => setField\('phone', e\.target\.value\.replace\(\/\\D\/g, ''\)\)\}/)

  // validation runs before the Supabase register/completeOAuthRegistration call
  const submitBody = registerSource.match(/const submit = async \(e\) => \{[\s\S]*?\n  \}/)[0]
  const nameCheckIndex = submitBody.indexOf('setNameError')
  const phoneCheckIndex = submitBody.indexOf('setPhoneError')
  const registerCallIndex = submitBody.indexOf('oauthSignup ? completeOAuthRegistration : register')
  assert.ok(nameCheckIndex > -1 && phoneCheckIndex > -1 && registerCallIndex > -1)
  assert.ok(nameCheckIndex < registerCallIndex)
  assert.ok(phoneCheckIndex < registerCallIndex)

  // existing email duplicate-check and password rules are untouched, not duplicated
  assert.match(registerSource, /checkEmailExists/)
  assert.match(registerSource, /form\.password\.length < 6/)
  assert.match(registerSource, /form\.password !== form\.passwordConfirm/)
})
