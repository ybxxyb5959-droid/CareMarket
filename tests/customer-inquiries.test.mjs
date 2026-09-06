import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  CUSTOMER_INQUIRY_SELECT,
  INQUIRY_STATUS_LABELS,
  inquiryStatusLabel,
  isAnsweredInquiry,
  validateAdminInquiryAnswer,
} from '../src/lib/support.js'

const readSource = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')
const customerPage = readSource('../src/pages/SupportInquiries.jsx')
const adminPage = readSource('../src/pages/AdminInquiries.jsx')
const adminLibrary = readSource('../src/lib/admin.js')
const navigation = readSource('../src/lib/navigation.js')
const topbar = readSource('../src/components/AdminTopbar.jsx')
const styles = readSource('../src/index.css')
const workflowMigration = readSource('../supabase/migrations/20260906000200_customer_inquiry_answer_workflow.sql')

test('existing received and in-progress states remain waiting while answered is complete', () => {
  assert.deepEqual(INQUIRY_STATUS_LABELS, {
    received: '답변 대기',
    in_progress: '답변 대기',
    answered: '답변 완료',
  })
  assert.equal(inquiryStatusLabel('received'), '답변 대기')
  assert.equal(inquiryStatusLabel('in_progress'), '답변 대기')
  assert.equal(inquiryStatusLabel('answered'), '답변 완료')
  assert.equal(isAnsweredInquiry({ status: 'answered' }), true)
  assert.equal(isAnsweredInquiry('received'), false)
})

test('customer reads request only customer-visible columns and exclude internal admin notes', () => {
  assert.match(CUSTOMER_INQUIRY_SELECT, /admin_answer/)
  assert.match(CUSTOMER_INQUIRY_SELECT, /answered_at/)
  assert.doesNotMatch(CUSTOMER_INQUIRY_SELECT, /admin_note/)
  assert.match(workflowMigration, /revoke select on table public\.customer_inquiries from authenticated/i)
  assert.match(workflowMigration, /grant select \([\s\S]*admin_answer[\s\S]*answered_at[\s\S]*\) on table public\.customer_inquiries to authenticated/i)
  assert.doesNotMatch(workflowMigration.match(/grant select \([\s\S]*?\) on table public\.customer_inquiries to authenticated/i)?.[0] || '', /admin_note|answered_by|privacy_agreed/i)
})

test('answer validation rejects empty and oversized responses', () => {
  assert.match(validateAdminInquiryAnswer('   '), /입력/)
  assert.match(validateAdminInquiryAnswer('a'.repeat(4001)), /4,000자/)
  assert.equal(validateAdminInquiryAnswer('확인 후 처리했습니다.'), '')
})

test('customer inquiry history and detail expose required waiting, answered, empty and error states', () => {
  assert.match(navigation, /supportInquiries:\s*'\/support\/inquiries'/)
  assert.match(customerPage, /1:1 문의 내역/)
  assert.match(customerPage, /아직 접수한 문의가 없어요/)
  assert.match(customerPage, /문의 내역을 불러오지 못했어요/)
  assert.match(customerPage, /답변을 준비하고 있어요/)
  assert.match(customerPage, /CareMarket 답변/)
  assert.match(customerPage, /inquiry\.admin_answer/)
  assert.match(customerPage, /inquiry\.answered_at/)
})

test('administrator inquiry page reuses the admin table and modal flow', () => {
  assert.match(navigation, /adminInquiries:\s*'\/admin\/inquiries'/)
  assert.match(topbar, />1:1 문의 관리</)
  assert.match(adminPage, /admin-product-editor-shell admin-inquiry-detail/)
  assert.match(adminPage, /문의 목록을 불러오지 못했습니다/)
  assert.match(adminPage, /접수된 1:1 문의가 없습니다/)
  assert.match(adminPage, /답변 등록 중\.\.\./)
  assert.match(adminPage, /답변이 등록되었습니다/)
  assert.match(adminLibrary, /supabase\.rpc\('admin_answer_customer_inquiry'/)
})

test('inquiry layouts cover desktop, tablet and mobile without body-width tables', () => {
  assert.match(styles, /\.support-inquiry-table-wrap \{ overflow: visible;/)
  assert.match(styles, /\.support-inquiry-table thead \{ display: none;/)
  assert.match(styles, /\.admin-inquiry-detail-grid \{ grid-template-columns: 1fr;/)
  assert.match(styles, /white-space: pre-wrap; overflow-wrap: anywhere;/)
})
