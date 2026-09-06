import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  EMPTY_INQUIRY_FORM,
  INQUIRY_CATEGORIES,
  SUPPORT_CATEGORIES,
  SUPPORT_FAQS,
  searchSupportFaqs,
  submitCustomerInquiry,
  toCustomerInquiryPayload,
  validateCustomerInquiry,
} from '../src/lib/support.js'

const migration = readFileSync(new URL('../supabase/migrations/20260906000100_customer_inquiries.sql', import.meta.url), 'utf8')
const workflowMigration = readFileSync(new URL('../supabase/migrations/20260906000200_customer_inquiry_answer_workflow.sql', import.meta.url), 'utf8')
const supportPage = readFileSync(new URL('../src/pages/Support.jsx', import.meta.url), 'utf8')
const inquiryPage = readFileSync(new URL('../src/pages/SupportInquiry.jsx', import.meta.url), 'utf8')
const myPage = readFileSync(new URL('../src/pages/MyPage.jsx', import.meta.url), 'utf8')
const footer = readFileSync(new URL('../src/components/Footer.jsx', import.meta.url), 'utf8')

const validForm = {
  ...EMPTY_INQUIRY_FORM,
  category: '배송',
  orderId: '00000000-0000-4000-8000-000000000010',
  title: '배송 상태를 확인하고 싶어요',
  content: '주문한 상품의 배송 상태를 확인해 주세요.',
  contactEmail: 'CUSTOMER@example.test',
  privacyAgreed: true,
}

test('FAQ uses six requested categories and 18 factual entries', () => {
  assert.deepEqual(SUPPORT_CATEGORIES, ['주문·결제', '배송', '취소·반품·환불', '회원', '상품·영양정보', '입점·제휴'])
  assert.equal(SUPPORT_FAQS.length, 18)
  assert.equal(SUPPORT_FAQS.filter((faq) => faq.featured).length, 6)
  for (const category of SUPPORT_CATEGORIES) {
    assert.equal(SUPPORT_FAQS.filter((faq) => faq.category === category).length, 3, category)
  }
})

test('FAQ search matches question, answer and category without an API', () => {
  assert.deepEqual(searchSupportFaqs('무료배송').map((faq) => faq.id), ['free-shipping'])
  assert.ok(searchSupportFaqs('토스페이먼츠').some((faq) => faq.id === 'payment-methods'))
  assert.ok(searchSupportFaqs('입점·제휴').every((faq) => faq.category === '입점·제휴'))
  assert.deepEqual(searchSupportFaqs('일치하지-않는-검색어-987654'), [])
  assert.match(supportPage, /aria-expanded=\{expanded\}/)
  assert.match(supportPage, /검색 결과가 없어요/)
})

test('customer inquiry validation covers required values, email and privacy consent', () => {
  const emptyErrors = validateCustomerInquiry(EMPTY_INQUIRY_FORM)
  assert.deepEqual(Object.keys(emptyErrors), ['category', 'title', 'content', 'contactEmail', 'privacyAgreed'])
  assert.match(validateCustomerInquiry({ ...validForm, contactEmail: 'wrong-email' }).contactEmail, /이메일 형식/)
  assert.match(validateCustomerInquiry({ ...validForm, privacyAgreed: false }).privacyAgreed, /동의/)
  assert.deepEqual(validateCustomerInquiry(validForm), {})
  assert.deepEqual(INQUIRY_CATEGORIES, ['주문/결제', '배송', '취소/반품/환불', '상품', '회원', '기타'])
})

test('customer inquiry payload binds the authenticated user and omits protected workflow fields', () => {
  const userId = '00000000-0000-4000-8000-000000000001'
  const inquiryId = '00000000-0000-4000-8000-000000000002'
  const payload = toCustomerInquiryPayload(validForm, userId, inquiryId)
  assert.deepEqual(payload, {
    id: inquiryId,
    user_id: userId,
    category: '배송',
    order_id: validForm.orderId,
    title: validForm.title,
    content: validForm.content,
    contact_email: 'customer@example.test',
    privacy_agreed: true,
  })
  assert.equal(payload.status, undefined)
  assert.equal(payload.admin_note, undefined)
  assert.throws(() => toCustomerInquiryPayload(validForm, ''), /AUTH_REQUIRED/)
})

test('submission inserts once through the customer inquiries table and returns its client receipt id', async () => {
  const calls = []
  const client = {
    from(table) {
      assert.equal(table, 'customer_inquiries')
      return {
        async insert(payload) {
          calls.push(payload)
          return { error: null }
        },
      }
    },
  }
  const result = await submitCustomerInquiry(client, validForm, '00000000-0000-4000-8000-000000000001')
  assert.equal(calls.length, 1)
  assert.match(result.id, /^[0-9a-f-]{36}$/i)
})

test('migrations enforce authenticated ownership, customer reads and administrator-only atomic answers', () => {
  assert.match(migration, /alter table public\.customer_inquiries enable row level security/i)
  assert.match(migration, /for insert\s+to authenticated/i)
  assert.match(migration, /auth\.uid\(\)\) = user_id/i)
  assert.match(migration, /orders\.user_id = \(select auth\.uid\(\)\)/i)
  assert.match(migration, /status = 'received'/i)
  assert.match(migration, /customer_inquiries_admin_select[\s\S]*public\.is_admin\(\)/i)
  assert.match(migration, /customer_inquiries_admin_update[\s\S]*public\.is_admin\(\)/i)
  assert.match(migration, /grant update \(status, admin_note, answered_at, answered_by\)/i)
  assert.doesNotMatch(migration, /to anon/i)
  assert.doesNotMatch(migration, /customer_inquiries_select_own/i)
  assert.match(workflowMigration, /customer_inquiries_select_own[\s\S]*auth\.uid\(\)\) = user_id/i)
  assert.match(workflowMigration, /add column if not exists admin_answer text/i)
  assert.match(workflowMigration, /security definer[\s\S]*public\.is_admin\(\)/i)
  assert.match(workflowMigration, /admin_answer = v_answer[\s\S]*status = 'answered'[\s\S]*answered_at = clock_timestamp\(\)[\s\S]*answered_by = auth\.uid\(\)/i)
  assert.match(workflowMigration, /revoke update on table public\.customer_inquiries from authenticated/i)
  assert.match(workflowMigration, /grant execute on function public\.admin_answer_customer_inquiry\(uuid, text\)[\s\S]*to authenticated/i)
  assert.doesNotMatch(workflowMigration, /to anon/i)
})

test('inquiry UX keeps values on failure and exposes loading, success and retry states', () => {
  assert.match(inquiryPage, /submissionLock\.current/)
  assert.match(inquiryPage, /문의 접수 중\.\.\./)
  assert.match(inquiryPage, /문의를 접수하지 못했어요/)
  assert.match(inquiryPage, /다시 시도/)
  assert.match(inquiryPage, /문의가 접수되었습니다/)
  assert.match(inquiryPage, /내 문의 확인하기/)
  assert.match(inquiryPage, /접수번호/)
  const catchBlock = inquiryPage.match(/catch \(error\) \{[\s\S]*?\n    \} finally/)
  assert.ok(catchBlock)
  assert.doesNotMatch(catchBlock[0], /setValues/)
})

test('support and mypage keep persistent inquiry entry points', () => {
  assert.match(supportPage, /navigate\('supportInquiry'\)/)
  assert.match(supportPage, /navigate\('supportInquiries'\)/)
  assert.match(myPage, /1:1 문의 내역/)
  assert.match(myPage, /navigate\('supportInquiries'\)/)
})

test('footer keeps only order lookup, FAQ and direct inquiry support links', () => {
  assert.doesNotMatch(footer, /\['고객지원', 'support'\]/)
  assert.match(footer, /\['주문 · 배송 조회', 'orders'\]/)
  assert.match(footer, /\['FAQ', 'support'\]/)
  assert.match(footer, /\['1:1 문의', 'supportInquiry'\]/)
})
