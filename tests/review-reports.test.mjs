import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { submitReviewReport } from '../src/lib/reviews.js'
import { getDashboardMetrics } from '../src/lib/admin-dashboard.js'

test('report validation rejects missing other detail before calling server', async () => {
  let called = false
  const client = { rpc: async () => { called = true; return { data: {} } } }
  await assert.rejects(submitReviewReport(client, { review: { id: 'x' }, productId: 1, reason: '기타', detail: ' ' }))
  assert.equal(called, false)
  await submitReviewReport(client, { review: { id: 'x', content: 'text' }, productId: 1, reason: '광고성', detail: '' })
  assert.equal(called, true)
})
test('dashboard counts only unresolved reports', () => {
  assert.equal(getDashboardMetrics({ reviewReports: [{ status: 'received' }, { status: 'received' }, { status: 'deleted' }, { status: 'dismissed' }] }).waitingReviewReports, 2)
})
test('report SQL enforces access, duplicate protection and atomic deletion', { skip: !process.env.PGLITE_MODULE }, async () => {
  const { PGlite } = await import(pathToFileURL(process.env.PGLITE_MODULE).href)
  const db = new PGlite()
  const user = '00000000-0000-4000-8000-000000000001'
  const second = '00000000-0000-4000-8000-000000000002'
  const review = '00000000-0000-4000-8000-000000000003'
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
      create function public.is_admin() returns boolean language sql as $$ select coalesce(current_setting('test.admin', true), '') = 'yes' $$;
      create table public.products(product_id bigint primary key, name text);
      create table public.profiles(user_id uuid primary key, display_name text);
      create table public.reviews(id uuid primary key, product_id bigint, content text, deleted_at timestamptz, is_hidden boolean default false);
      insert into products values(1, '테스트 상품');
      insert into profiles values ('${user}', '회원'), ('${second}', '두번째 회원');
      insert into reviews(id, product_id, content) values ('${review}', 1, '원본 리뷰');`)
    await db.exec(readFileSync(new URL('../supabase/migrations/20260908000200_review_reports.sql', import.meta.url), 'utf8'))
    await db.exec(readFileSync(new URL('../supabase/migrations/20260908000300_review_report_sample_range.sql', import.meta.url), 'utf8'))
    const report = () => db.query('select submit_review_report($1, 1, $2, $3, $4) as result', [review, '광고성', '', '위조된 본문'])
    await assert.rejects(report())
    await db.exec(`set role authenticated; set test.uid = '${user}';`)
    await assert.rejects(db.query('select * from review_reports'))
    await assert.rejects(db.query('select get_admin_review_reports()'))
    await assert.rejects(db.query("select submit_review_report('1-sample-500', 1, '광고성', '', 'fake')"))
    const first = (await report()).rows[0].result
    assert.ok(first.id)
    assert.equal((await report()).rows[0].result.duplicate, true)
    await assert.rejects(db.query("select resolve_review_report($1, 'deleted')", [first.id]))
    await db.exec(`set test.uid = '${second}';`)
    await report()
    await db.exec("set test.admin = 'yes'")
    const rows = (await db.query('select get_admin_review_reports() as rows')).rows[0].rows
    assert.equal(rows.length, 2)
    assert.equal(rows[0].content, '원본 리뷰')
    await db.query("select resolve_review_report($1, 'deleted')", [first.id])
    await db.exec('reset role')
    assert.ok((await db.query('select deleted_at from reviews')).rows[0].deleted_at)
    await db.exec('set role authenticated')
    assert.ok((await db.query('select get_admin_review_reports() as rows')).rows[0].rows.every(row => row.status === 'deleted'))
    await assert.rejects(report())
    const sample = (await db.query("select submit_review_report('1-sample-0', 1, '기타', '확인 요청', '기본 후기') as result")).rows[0].result
    await db.query("select resolve_review_report($1, 'deleted')", [sample.id])
    assert.equal((await db.query('select target from deleted_sample_reviews')).rows[0].target, '1-sample-0')
    await assert.rejects(db.query("select submit_review_report('1-sample-0', 1, '광고성', '', '기본 후기')"))
    const keep = (await db.query("select submit_review_report('1-sample-1', 1, '광고성', '', '기본 후기') as result")).rows[0].result
    await db.query("select resolve_review_report($1, 'dismissed')", [keep.id])
    assert.equal((await db.query('select count(*)::int as count from deleted_sample_reviews')).rows[0].count, 1)
  } finally { await db.close() }
})

test('non-other reasons discard the hidden detail', async () => {
  let sent
  await submitReviewReport({ rpc: async (_name, args) => { sent = args; return { data: {} } } }, { review: { id: 'x' }, productId: 1, reason: '광고성', detail: 'previous other text' })
  assert.equal(sent.p_detail, '')
})
