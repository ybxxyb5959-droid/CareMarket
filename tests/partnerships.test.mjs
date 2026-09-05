import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  EMPTY_PARTNERSHIP_FORM,
  PARTNERSHIP_PROPOSAL_TYPES,
  submitPartnershipInquiry,
  toPartnershipPayload,
  validatePartnershipForm,
} from '../src/lib/partnerships.js'

const migration = readFileSync(new URL('../supabase/migrations/20260905000800_partnership_inquiries.sql', import.meta.url), 'utf8')
const partnerPage = readFileSync(new URL('../src/pages/ServiceInfo.jsx', import.meta.url), 'utf8')
const proposalPage = readFileSync(new URL('../src/pages/PartnerProposal.jsx', import.meta.url), 'utf8')
const adminPage = readFileSync(new URL('../src/pages/AdminPartnerships.jsx', import.meta.url), 'utf8')
const adminTopbar = readFileSync(new URL('../src/components/AdminTopbar.jsx', import.meta.url), 'utf8')
const adminLib = readFileSync(new URL('../src/lib/admin.js', import.meta.url), 'utf8')
const partnershipLib = readFileSync(new URL('../src/lib/partnerships.js', import.meta.url), 'utf8')
const supabaseConfig = readFileSync(new URL('../supabase/config.toml', import.meta.url), 'utf8')

const validForm = {
  ...EMPTY_PARTNERSHIP_FORM,
  brandName: '그리너리랩',
  contactName: '김케어',
  email: 'hello@greenery.example',
  proposalType: PARTNERSHIP_PROPOSAL_TYPES[0],
  productCategory: '건강 간편식',
  brandDescription: '좋은 원재료로 일상의 식사를 만듭니다.',
  privacyAgreed: true,
}

test('partnership form validates required fields and email format without discarding values', () => {
  const required = validatePartnershipForm(EMPTY_PARTNERSHIP_FORM)
  assert.equal(required.brandName, '브랜드명을 입력해 주세요.')
  assert.equal(required.privacyAgreed, '개인정보 수집 및 이용에 동의해 주세요.')
  assert.match(validatePartnershipForm({ ...validForm, email: 'invalid' }).email, /이메일 형식/)
  assert.deepEqual(validatePartnershipForm(validForm), {})
})

test('public submission payload only contains intake fields and normalizes email', () => {
  const payload = toPartnershipPayload({ ...validForm, email: ' Hello@Greenery.Example ' }, '00000000-0000-4000-8000-000000000001')
  assert.equal(payload.email, 'hello@greenery.example')
  assert.equal(payload.privacy_agreed, true)
  assert.equal(payload.status, undefined)
  assert.equal(payload.admin_note, undefined)
})

test('partnership table RLS allows public insert but reserves reads and updates for admins', () => {
  assert.match(migration, /alter table public\.partnership_inquiries enable row level security/i)
  assert.match(migration, /for insert[\s\S]*to anon, authenticated[\s\S]*status = 'new'/i)
  assert.match(migration, /for select[\s\S]*using \(\(select public\.is_admin\(\)\)\)/i)
  assert.match(migration, /for update[\s\S]*using \(\(select public\.is_admin\(\)\)\)/i)
  assert.match(migration, /grant update \(status, admin_note, reviewed_at, reviewed_by\)/i)
  assert.doesNotMatch(migration, /grant delete/i)
})

test('successful submission stops after the database insert without invoking an Edge Function', async () => {
  let insertedPayload = null
  let functionInvocations = 0
  const supabase = {
    from(table) {
      assert.equal(table, 'partnership_inquiries')
      return {
        async insert(payload) {
          insertedPayload = payload
          return { error: null }
        },
      }
    },
    functions: {
      async invoke() {
        functionInvocations += 1
        return { data: null, error: null }
      },
    },
  }

  const result = await submitPartnershipInquiry(supabase, validForm)
  assert.equal(result.id, insertedPayload.id)
  assert.equal(functionInvocations, 0)
})

test('partnership runtime and admin UI have no email notification dependency', () => {
  const runtime = [partnershipLib, proposalPage, adminPage, adminLib, supabaseConfig].join('\n')
  assert.doesNotMatch(runtime, /notify-partnership|RESEND_API_KEY|PARTNERSHIP_(?:RECEIVER|FROM)_EMAIL|notification_sent_at|notificationSent/i)
  assert.match(adminTopbar, />협업 제안<\/button>/)
  assert.match(adminPage, /<h1>협업 제안<\/h1>/)
})

test('the remaining Partner header CTA targets the existing proposal view', () => {
  assert.match(partnerPage, /href="\/partners\/proposal"[\s\S]*?navigate\('partnerProposal'\)/)
  assert.doesNotMatch(partnerPage, /cta:\s*\{ label: '입점 · 제휴 제안하기', view: 'partnerProposal' \}/)
})
