import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { pathToFileURL } from 'node:url'

// Optional PostgreSQL WASM engine. Always in-memory; never uses Supabase credentials.
test('cart migration and two-user RLS in local PostgreSQL', { skip: !process.env.PGLITE_MODULE }, async (t) => {
  const { PGlite } = await import(pathToFileURL(process.env.PGLITE_MODULE).href)
  const db = new PGlite()
  t.after(() => db.close())
  const a = '00000000-0000-4000-8000-000000000001'
  const b = '00000000-0000-4000-8000-000000000002'
  const schema = fs.readFileSync(new URL('../supabase/migrations/20260903000000_initial_caremarket_schema.sql', import.meta.url), 'utf8')
  const migration = fs.readFileSync(new URL('../supabase/migrations/20260904000100_cart_rls_and_atomic_quantity.sql', import.meta.url), 'utf8')
  await db.exec(`
    create role anon;
    create role authenticated;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth, public to anon, authenticated;
  `)
  await db.exec(schema.replace('create extension if not exists pgcrypto;', ''))
  await db.exec(`
    insert into auth.users values ('${a}'), ('${b}');
    insert into public.profiles(user_id, display_name) values ('${a}', 'A'), ('${b}', 'B');
    insert into public.products(product_id, name, brand, category, price, is_active)
      values (101, 'Test A', 'Test', 'Test', 100, true), (202, 'Test B', 'Test', 'Test', 200, true), (303, 'Inactive', 'Test', 'Test', 100, false);
    grant select on public.products to anon, authenticated;
  `)
  await db.exec(fs.readFileSync(new URL('../supabase/migrations/20260903000300_enable_products_select_rls.sql', import.meta.url), 'utf8'))
  await db.exec(migration)
  await db.exec(migration)
  assert.equal((await db.query("select count(*)::int as n from pg_policies where tablename='cart_items'")).rows[0].n, 4)
  const asUser = async (id) => {
    await db.exec('reset role; set role authenticated;')
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id])
  }
  const rpcAdd = (owner, product = 101) => db.query('select public.add_my_cart_item($1, 1, $2)', [product, owner])
  await t.test('same-item adds are one row; delta updates preserve minimum one', async () => {
    await asUser(a)
    for (let n = 0; n < 20; n++) await rpcAdd(a)
    let rows = (await db.query('select * from cart_items')).rows
    assert.equal(rows.length, 1)
    assert.equal(rows[0].quantity, 20)
    await db.query('select public.change_my_cart_quantity(101, 1, $1)', [a])
    assert.equal((await db.query('select quantity from cart_items')).rows[0].quantity, 21)
    for (let n = 0; n < 25; n++) await db.query('select public.change_my_cart_quantity(101, -1, $1)', [a])
    assert.equal((await db.query('select quantity from cart_items')).rows[0].quantity, 1)
  })
  await t.test('A cannot read, update, delete or insert B rows; owner reassignment is rejected', async () => {
    await asUser(b)
    await rpcAdd(b, 202)
    const bRow = (await db.query('select cart_item_id from cart_items')).rows[0].cart_item_id
    await asUser(a)
    assert.equal((await db.query('select * from cart_items where user_id = $1', [b])).rows.length, 0)
    assert.equal((await db.query('update cart_items set quantity=99 where cart_item_id=$1 returning *', [bRow])).rows.length, 0)
    assert.equal((await db.query('delete from cart_items where cart_item_id=$1 returning *', [bRow])).rows.length, 0)
    await assert.rejects(db.query('insert into cart_items(user_id,product_id,quantity) values ($1,101,1)', [b]), /row-level security/)
    await assert.rejects(db.query('update cart_items set user_id=$1', [b]), /row-level security/)
    await assert.rejects(rpcAdd(b), /Authenticated cart owner required/)
    await asUser(b)
    assert.equal((await db.query('select quantity from cart_items')).rows[0].quantity, 1)
  })
  await t.test('invalid quantity, inactive product, mismatched session and null uid rejected', async () => {
    await asUser(a)
    await assert.rejects(db.query('select public.add_my_cart_item(101, 0, $1)', [a]), /positive/)
    await assert.rejects(db.query('select public.change_my_cart_quantity(101, 2, $1)', [a]), /Delta/)
    await assert.rejects(rpcAdd(a, 303), /unavailable/)
    await assert.rejects(db.query('select public.change_my_cart_quantity(101, 1, $1)', [b]), /Authenticated/)
    await asUser('')
    await assert.rejects(rpcAdd(a), /Authenticated/)
  })
  await t.test('anonymous CRUD and RPC execution are denied', async () => {
    await db.exec('reset role; set role anon;')
    for (const sql of ['select * from cart_items', 'delete from cart_items', 'update cart_items set quantity=2', `insert into cart_items(user_id,product_id,quantity) values ('${a}',101,1)`]) {
      await assert.rejects(db.query(sql), /permission denied/)
    }
    await assert.rejects(rpcAdd(a), /permission denied/)
  })
  await t.test('own delete is persistent and does not delete the other account', async () => {
    await asUser(a)
    await db.query('delete from cart_items where product_id=101')
    assert.equal((await db.query('select * from cart_items')).rows.length, 0)
    await asUser(b)
    assert.equal((await db.query('select * from cart_items')).rows.length, 1)
  })
  await t.test('unknown existing permissive policy aborts migration without replacing it', async () => {
    await db.exec('reset role; create policy unexpected_open_policy on cart_items for select using (true);')
    await assert.rejects(db.exec(migration), /Review existing cart_items policy/)
    await db.exec('rollback')
    assert.equal((await db.query("select count(*)::int as n from pg_policies where tablename='cart_items'")).rows[0].n, 5)
  })
})
