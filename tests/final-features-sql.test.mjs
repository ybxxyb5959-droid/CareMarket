import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { pathToFileURL } from 'node:url'

const migration = name => fs.readFileSync(new URL(`../supabase/migrations/${name}.sql`, import.meta.url), 'utf8').replace('create extension if not exists pgcrypto;', '')
test('final feature SQL contracts', { skip: !process.env.PGLITE_MODULE }, async t => {
  const { PGlite } = await import(pathToFileURL(process.env.PGLITE_MODULE).href)
  const db = new PGlite()
  t.after(() => db.close())
  const a = '00000000-0000-4000-8000-000000000001'
  const b = '00000000-0000-4000-8000-000000000002'
  await db.exec(`create role anon; create role authenticated; create role service_role;
    create schema auth; create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb, raw_app_meta_data jsonb);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create function auth.role() returns text language sql stable as $$ select current_setting('request.jwt.claim.role', true) $$;
    grant usage on schema public, auth to anon, authenticated;`)
  await db.exec(migration('20260903000000_initial_caremarket_schema'))
  await db.exec(`insert into auth.users values ('${a}'), ('${b}');
    insert into profiles(user_id,display_name) values ('${a}','A'),('${b}','B');
    insert into products(product_id,name,brand,category,price,stock) values (1,'A','Test','Test',10000,100),(2,'B','Test','Test',10000,100),(3,'C','Test','Test',10000,100);
    insert into orders(order_id,user_id,total_price,status) values ('10000000-0000-4000-8000-000000000001','${a}',10000,'paid'),('10000000-0000-4000-8000-000000000002','${b}',10000,'pending');
    insert into order_items(order_item_id,order_id,product_id,quantity,price_at_order) values
    ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001',1,2,10000),
    ('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002',2,99,10000);`)
  await db.exec(migration('20260904000200_checkout_payments'))
  await db.exec(migration('20260904000100_cart_rls_and_atomic_quantity'))
  await db.exec(migration('20260906000400_cart_stock_limit'))
  await db.exec(migration('20260906000500_best_products'))
  await t.test('best excludes pending and returns only sold active products to anonymous users', async () => {
    await db.exec('set role anon')
    assert.deepEqual((await db.query('select product_id from get_best_products()')).rows.map(r => r.product_id), [1])
    await assert.rejects(db.query('select * from orders'), /permission denied/)
    await db.exec('reset role; update products set is_active=false where product_id=1')
    assert.equal((await db.query('select * from get_best_products()')).rows.length, 0)
    await db.exec('update products set is_active=true where product_id=1')
  })
  await db.exec(migration('20260906000600_verified_reviews'))
  await t.test('reviews enforce purchase, uniqueness, ownership and rating', async () => {
    await db.exec('set role authenticated')
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [a])
    const insert = (user = a, product = 1, item = '20000000-0000-4000-8000-000000000001', rating = 5) => db.query('insert into reviews(user_id,product_id,order_item_id,rating,content) values ($1,$2,$3,$4,$5) returning id',[user,product,item,rating,'좋아요'])
    await assert.rejects(insert(a,1,undefined,6), /check constraint/)
    await assert.rejects(insert(a,2), /row-level security/)
    const id = (await insert()).rows[0].id
    await assert.rejects(insert(), /unique constraint/)
    await db.query("update reviews set rating=4,content='수정' where id=$1",[id])
    await assert.rejects(db.query('update reviews set product_id=2 where id=$1',[id]), /permission denied/)
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [b])
    await assert.rejects(insert(b,2,'20000000-0000-4000-8000-000000000002'), /row-level security/)
    await assert.rejects(insert(b), /row-level security/)
    assert.equal((await db.query("update reviews set content='타인' where id=$1 returning id",[id])).rows.length,0)
    assert.equal((await db.query('delete from reviews where id=$1 returning id',[id])).rows.length,0)
    await db.exec('reset role; set role anon')
    assert.equal((await db.query('select rating from reviews')).rows[0].rating,4)
    assert.deepEqual((await db.query('select get_product_review_summary(1) summary')).rows[0].summary, { count:1, average:4 })
    await db.exec('reset role; set role authenticated')
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [a])
    assert.equal((await db.query('delete from reviews where id=$1 returning id',[id])).rows.length,1)
    assert.deepEqual((await db.query('select get_product_review_summary(1) summary')).rows[0].summary, { count:0, average:null })
    await db.exec('reset role')
  })
  await db.exec(migration('20260905000400_checkout_shipping_snapshot'))
  await db.exec(migration('20260905000600_order_fulfillment_bulk'))
  await db.exec(migration('20260903000100_create_profile_on_signup'))
  await db.exec(migration('20260905000200_profile_contact_and_agreements'))
  await db.exec(migration('20260906000700_welcome_coupon'))
  await db.exec(migration('20260906001200_google_registration_completion'))
  await db.exec(migration('20260906001300_kakao_oauth_profile_support'))
  await db.exec(migration('20260906001400_resume_oauth_registration'))
  await t.test('OAuth signup creates one profile and coupon; completion is atomic and repeat-safe', async () => {
    const googleId = '00000000-0000-4000-8000-000000000009'
    await db.query('insert into auth.users(id,email,raw_user_meta_data) values ($1,$2,$3)', [googleId, 'google@example.test', { full_name: 'Google Test' }])
    await db.query('update auth.users set raw_app_meta_data=$1 where id=$2', [{ provider: 'google' }, googleId])
    const snapshot = async () => (await db.query('select display_name,phone,terms_agreed_at,privacy_agreed_at,role from profiles where user_id=$1', [googleId])).rows[0]
    const couponCount = async () => (await db.query('select count(*)::int n from user_coupons where user_id=$1', [googleId])).rows[0].n
    assert.equal((await snapshot()).terms_agreed_at, null)
    assert.equal(await couponCount(), 1)
    await db.exec('set role anon')
    const complete = (agreed = true) => db.query("select complete_google_registration('Google Test','01012345678','12345','서울','', $1,true,false)", [agreed])
    await assert.rejects(complete(), /permission denied/)
    await db.exec('reset role; set role authenticated')
    await db.query("select set_config('request.jwt.claim.sub','',false)")
    await assert.rejects(complete(), /Authentication required/)
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [googleId])
    await assert.rejects(complete(false), /Required registration fields missing/)
    await complete()
    await db.exec('reset role')
    const first = await snapshot()
    assert.equal(first.phone, '01012345678')
    assert.equal(first.role, 'user')
    assert.ok(first.terms_agreed_at && first.privacy_agreed_at)
    assert.equal(await couponCount(), 1)
    await db.exec('set role authenticated')
    await complete()
    await db.exec('reset role')
    assert.deepEqual(await snapshot(), first)
    assert.equal(await couponCount(), 1)
    assert.equal((await db.query('select count(*)::int n from profiles where user_id=$1', [googleId])).rows[0].n, 1)
  })
  await t.test('email-less Kakao signup keeps one profile/coupon and reuses the completion RPC', async () => {
    const id = '00000000-0000-4000-8000-000000000010'
    await db.query('insert into auth.users(id,email,raw_user_meta_data,raw_app_meta_data) values ($1,null,$2,$3)', [id, {}, { provider: 'kakao' }])
    assert.equal((await db.query('select display_name from profiles where user_id=$1', [id])).rows[0].display_name, 'CareMarket 회원')
    await db.exec('set role authenticated')
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id])
    for (let attempt = 0; attempt < 2; attempt++) {
      await db.query("select complete_google_registration('카카오 회원','01012345678',null,'서울',null,true,true,false)")
    }
    await db.exec('reset role')
    const profile = (await db.query('select * from profiles where user_id=$1', [id])).rows[0]
    assert.equal(profile.display_name, '카카오 회원')
    assert.ok(profile.terms_agreed_at && profile.privacy_agreed_at)
    assert.equal(profile.role, 'user')
    assert.equal((await db.query('select email from auth.users where id=$1', [id])).rows[0].email, null)
    assert.equal((await db.query('select count(*)::int n from user_coupons where user_id=$1', [id])).rows[0].n, 1)
    await db.exec('set role authenticated')
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [a])
    await assert.rejects(db.query("select complete_google_registration('Other','01012345678',null,'서울',null,true,true,false)"), /Supported OAuth account required/)
    await db.exec('reset role')
  })
  await t.test('interrupted Kakao signup resumes with the same auth user, preserving existing profile and coupon', async () => {
    const id = '00000000-0000-4000-8000-000000000011'
    await db.query('insert into auth.users(id,raw_app_meta_data) values ($1,$2)', [id, { provider: 'kakao' }])
    const original = (await db.query('select * from profiles where user_id=$1', [id])).rows[0]
    assert.equal(original.phone, null)
    // Leaving the page and logging back in does not insert another auth user.
    await db.exec('set role authenticated')
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id])
    const complete = () => db.query("select complete_google_registration('재로그인 회원','01012345678',null,'서울',null,true,true,false)")
    await complete()
    await db.exec('reset role')
    const saved = (await db.query('select * from profiles where user_id=$1', [id])).rows[0]
    assert.deepEqual(saved.created_at, original.created_at)
    assert.ok(saved.terms_agreed_at && saved.privacy_agreed_at)
    await db.exec('set role authenticated')
    await complete()
    await db.exec('reset role')
    assert.deepEqual((await db.query('select * from profiles where user_id=$1', [id])).rows[0], saved)
    assert.equal((await db.query('select count(*)::int n from auth.users where id=$1', [id])).rows[0].n, 1)
    assert.equal((await db.query('select count(*)::int n from user_coupons where user_id=$1', [id])).rows[0].n, 1)
  })
  await t.test('missing OAuth profile is recovered only after validated completion and never duplicates on retry', async () => {
    const id = '00000000-0000-4000-8000-000000000012'
    // Reproduce a legacy auth user for whom the profile trigger never ran.
    await db.exec('alter table auth.users disable trigger user')
    await db.query('insert into auth.users(id,raw_app_meta_data) values ($1,$2)', [id, { provider: 'kakao' }])
    await db.exec('alter table auth.users enable trigger user; set role authenticated')
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id])
    await assert.rejects(db.query("select complete_google_registration('','01012345678',null,'서울',null,true,true,false)"), error => error.code === '22023')
    await db.exec('reset role')
    assert.equal((await db.query('select count(*)::int n from profiles where user_id=$1', [id])).rows[0].n, 0)
    await db.exec('set role authenticated')
    for (let retry = 0; retry < 2; retry++) {
      await db.query("select complete_google_registration('복구 회원','01012345678',null,'서울',null,true,true,false)")
    }
    await db.exec('reset role')
    const rows = (await db.query('select * from profiles where user_id=$1', [id])).rows
    assert.equal(rows.length, 1)
    assert.equal(rows[0].role, 'user')
    assert.equal(rows[0].primary_goal, null)
    assert.ok(rows[0].terms_agreed_at && rows[0].privacy_agreed_at)
    // The existing profile-created coupon trigger still runs once on recovery.
    assert.equal((await db.query('select count(*)::int n from user_coupons where user_id=$1', [id])).rows[0].n, 1)
  })
  await t.test('signup coupon is single-use, server priced, atomic and idempotent', async () => {
    const c = '00000000-0000-4000-8000-000000000003'
    await db.exec(`insert into auth.users(id,email,raw_user_meta_data) values ('${c}','c@example.test','{"display_name":"C","terms_agreed":true,"privacy_agreed":true}');
      insert into cart_items(user_id,product_id,quantity) values ('${c}',1,2);`)
    assert.equal((await db.query('select count(*)::int n from user_coupons where user_id=$1',[c])).rows[0].n,1)
    const coupon = (await db.query('select id from user_coupons where user_id=$1',[c])).rows[0].id
    await assert.rejects(db.query("insert into user_coupons(user_id,coupon_id) values ($1,'welcome20')",[c]), /unique/)
    await db.exec('set role authenticated')
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [a])
    assert.equal((await db.query('select * from user_coupons')).rows.length,0)
    const checkout = () => db.query("select create_coupon_checkout_order('Name','01012345678','12345','Address','','',$1) result",[coupon])
    await assert.rejects(checkout(), /CHECKOUT_COUPON_UNAVAILABLE/)
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [c])
    await assert.rejects(db.query("update user_coupons set used_at=null"), /permission denied/)
    const order1 = (await checkout()).rows[0].result
    const order2 = (await checkout()).rows[0].result
    assert.equal(order1.total_price,19000)
    assert.equal(order1.discount_amount,4000)
    await db.exec('reset role')
    await db.query("select set_config('request.jwt.claim.role','service_role',false)")
    const complete = (id,key) => db.query('select complete_paid_order($1,$2) result',[id,key])
    await db.query('update products set stock=0 where product_id=1')
    await assert.rejects(complete(order1.order_id,'test-key'), /CHECKOUT_STOCK_UNAVAILABLE/)
    assert.equal((await db.query('select used_at from user_coupons where id=$1',[coupon])).rows[0].used_at,null)
    await db.query('update products set stock=100 where product_id=1')
    const first = (await complete(order1.order_id,'test-key')).rows[0].result
    assert.equal(first.status,'preparing')
    assert.equal(first.already_paid,false)
    assert.equal((await complete(order1.order_id,'test-key')).rows[0].result.already_paid,true)
    assert.equal((await db.query('select stock from products where product_id=1')).rows[0].stock,98)
    assert.equal((await db.query('select used_order_id from user_coupons where id=$1',[coupon])).rows[0].used_order_id,order1.order_id)
    await assert.rejects(complete(order2.order_id,'test-other-key'), /CHECKOUT_COUPON_UNAVAILABLE/)
    await assert.rejects(checkout(), /CHECKOUT_COUPON_UNAVAILABLE/)
  })
  await t.test('ordinary checkout still completes without a coupon and rejects forged discounts', async () => {
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[a])
    await db.query('insert into cart_items(user_id,product_id,quantity) values ($1,1,1)',[a])
    const result = (await db.query("select create_checkout_order('A','01012345678','12345','Address','','') result")).rows[0].result
    assert.equal(result.total_price,13000)
    await db.query('update orders set discount_amount=100 where order_id=$1',[result.order_id])
    await assert.rejects(db.query('select complete_paid_order($1,$2)',[result.order_id,'normal-key']), /CHECKOUT_TOTAL_INTEGRITY_ERROR/)
    await db.query('update orders set discount_amount=0 where order_id=$1',[result.order_id])
    const completed = (await db.query('select complete_paid_order($1,$2) result',[result.order_id,'normal-key'])).rows[0].result
    assert.equal(completed.status,'preparing')
    assert.equal(completed.total_price,13000)
    assert.equal((await db.query('select stock from products where product_id=1')).rows[0].stock,97)
  })
  await db.exec(migration('20260905000100_admin_management_rls'))
  await db.exec(migration('20260906001000_admin_sales_analytics'))
  await t.test('sales analytics uses Korea paid dates, zero days, prior period and admin authorization', async () => {
    await db.query("update profiles set role='admin' where user_id=$1", [a])
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [b])
    await assert.rejects(db.query("select get_admin_sales_summary('2025-01-02','2025-01-02')"), /Administrator role required/)
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [a])
    await db.exec(`insert into orders(order_id,user_id,total_price,status,created_at,paid_at) values
      ('30000000-0000-4000-8000-000000000001','${a}',4600,'paid','2024-12-01','2025-01-01T15:00:00Z'),
      ('30000000-0000-4000-8000-000000000002','${a}',2300,'delivered','2024-12-01','2025-01-01T14:59:59Z'),
      ('30000000-0000-4000-8000-000000000003','${a}',9900,'pending','2025-01-02',null);
      insert into order_items(order_id,product_id,quantity,price_at_order) values
      ('30000000-0000-4000-8000-000000000001',1,2,2300),
      ('30000000-0000-4000-8000-000000000002',2,1,2300),
      ('30000000-0000-4000-8000-000000000003',3,9,1100);`)
    const query = async (start, end) => (await db.query('select get_admin_sales_summary($1,$2) result', [start, end])).rows[0].result
    const one = await query('2025-01-02', '2025-01-02')
    assert.equal(one.total_payment, 4600)
    assert.equal(one.order_count, 1)
    assert.equal(one.quantity, 2)
    assert.equal(one.average_payment, 4600)
    assert.deepEqual(one.previous, { total_payment: 2300, order_count: 1, quantity: 1 })
    assert.equal(one.best[0].product_id, 1)
    assert.equal(one.best[0].revenue, 4600)
    assert.equal(one.categories[0].value, 2)
    const seven = await query('2025-01-02', '2025-01-08')
    assert.equal(seven.daily.length, 7)
    assert.equal(seven.daily[1].value, 0)
    assert.equal((await query('2025-02-01', '2025-03-02')).daily.length, 30)
    assert.equal((await query('2025-01-01', '2025-03-31')).daily.length, 90)
    const empty = await query('1900-01-01', '1900-01-03')
    assert.equal(empty.total_payment, 0)
    assert.deepEqual(empty.best, [])
    assert.deepEqual(empty.categories, [])
    assert.deepEqual(empty.daily.map(day => day.value), [0, 0, 0])
    await assert.rejects(query('2025-01-02', '2025-01-01'), /valid range/)
    await db.exec("update orders set payment_key='timestamp-test',status='paid' where order_id='30000000-0000-4000-8000-000000000003'")
    const timestamp = (await db.query("select paid_at from orders where order_id='30000000-0000-4000-8000-000000000003'")).rows[0].paid_at
    assert.ok(timestamp)
    await db.exec("update orders set status='preparing' where order_id='30000000-0000-4000-8000-000000000003'")
    assert.deepEqual((await db.query("select paid_at from orders where order_id='30000000-0000-4000-8000-000000000003'")).rows[0].paid_at, timestamp)
  })
})
