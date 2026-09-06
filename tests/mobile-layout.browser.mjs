import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'

const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href)
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH, headless: true })
const origin = process.env.CAREMARKET_TEST_ORIGIN || 'http://127.0.0.1:5175'

const encodeJwtPart = (value) => Buffer.from(JSON.stringify(value)).toString('base64url')
const makeSession = (userId, email) => ({
  access_token: `${encodeJwtPart({ alg: 'none', typ: 'JWT' })}.${encodeJwtPart({
    sub: userId,
    role: 'authenticated',
    aud: 'authenticated',
    exp: Math.floor(Date.now() / 1000) + 3600,
  })}.test-signature`,
  refresh_token: 'browser-fixture-refresh-token',
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  expires_in: 3600,
  token_type: 'bearer',
  user: { id: userId, aud: 'authenticated', role: 'authenticated', email },
})

async function installSession(context, session) {
  await context.addInitScript(({ storedSession }) => {
    localStorage.setItem('cm_welcome_hide_date', new Date().toISOString().slice(0, 10))
    localStorage.setItem('sb-owxgtzepynkwdixmwhim-auth-token', JSON.stringify(storedSession))
  }, { storedSession: session })
}

async function mockCommonReads(context, { role, orders = [], onStatusUpdate, onOrdersRead }) {
  await context.route('**/rest/v1/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const resource = url.pathname.split('/').pop()
    const select = url.searchParams.get('select') || ''
    const objectHeaders = { 'Content-Type': 'application/json', 'Content-Range': '0-0/1' }

    if (resource === 'profiles') {
      if (select.includes('role')) {
        await route.fulfill({ status: 200, headers: objectHeaders, body: JSON.stringify({ display_name: role === 'admin' ? 'CareMarket 관리자' : '일반 회원', primary_goal: 'muscle_gain', role }) })
      } else if (select.includes('user_id')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ user_id: orders[0]?.user_id, display_name: '박용빈' }]) })
      } else {
        await route.fulfill({ status: 200, headers: objectHeaders, body: JSON.stringify({ phone: null, postal_code: null, address: null, address_detail: null }) })
      }
      return
    }
    if (resource === 'user_preferences') {
      await route.fulfill({ status: 200, headers: objectHeaders, body: JSON.stringify({ low_sugar: false, low_sodium: false, high_protein: false, exclude_caffeine: false, excluded_allergens: [] }) })
      return
    }
    if (resource === 'orders') {
      onOrdersRead?.()
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(orders.map(o=>({...o,items:o.order_items.map(i=>({...i,product:i.products}))}))) })
      return
    }
    if (resource === 'admin_update_order_status') {
      onStatusUpdate?.(request.postDataJSON())
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify('shipped') })
      return
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  })
}

try {
  const adminUserId = '00000000-0000-4000-8000-000000000001'
  const longAddress = `서울특별시 강남구 테헤란로 ${'가'.repeat(180)}`
  const longRequest = `문 앞에 놓아주세요. ${'나'.repeat(170)}`
  const orders = [
    {
      order_id: '10000000-0000-4000-8000-000000000001',
      user_id: adminUserId,
      toss_order_id: 'CM-20260906-001',
      total_price: 43000,
      status: 'preparing',
      created_at: '2026-09-06T00:30:00.000Z',
      recipient_name: '박용빈',
      recipient_phone: '010-0000-0000',
      postal_code: '06236',
      address: longAddress,
      address_detail: '케어아파트 101동 101호',
      delivery_request: longRequest,
      order_items: [{ product_id: 1, quantity: 2, price_at_order: 20000, products: { name: '주문 당시 상품', brand: 'CareMarket' } }],
    },
    {
      order_id: '10000000-0000-4000-8000-000000000002',
      user_id: adminUserId,
      toss_order_id: 'CM-LEGACY-001',
      total_price: 13000,
      status: 'delivered',
      created_at: '2026-09-05T00:30:00.000Z',
      recipient_name: null,
      recipient_phone: null,
      postal_code: null,
      address: null,
      address_detail: null,
      delivery_request: null,
      order_items: [{ product_id: 2, quantity: 1, price_at_order: 10000, products: { name: '이전 주문 상품', brand: 'CareMarket' } }],
    },
    {
      order_id: '10000000-0000-4000-8000-000000000003',
      user_id: adminUserId,
      toss_order_id: 'CM-PENDING-001',
      total_price: 16000,
      status: 'pending',
      created_at: '2026-09-06T00:35:00.000Z',
      recipient_name: '박용빈',
      order_items: [{ product_id: 3, quantity: 1, price_at_order: 13000, products: { name: '결제 미완료 상품', brand: 'CareMarket' } }],
    },
    {
      order_id: '10000000-0000-4000-8000-000000000004',
      user_id: adminUserId,
      toss_order_id: 'CM-PAID-001',
      total_price: 23000,
      status: 'paid',
      created_at: '2026-09-06T00:34:00.000Z',
      recipient_name: '박용빈',
      order_items: [{ product_id: 4, quantity: 1, price_at_order: 20000, products: { name: '결제 완료 상품', brand: 'CareMarket' } }],
    },
  ]


 const products=JSON.parse((await import('node:fs')).readFileSync('data/products.seed.json','utf8')).map((p,i)=>({...p, product_id:i+1}));
 const context=await browser.newContext();
 await installSession(context,makeSession(adminUserId,'admin@example.test'));
 await mockCommonReads(context,{role:'admin', orders});
 await context.route('**/rest/v1/products?**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(products)}));

 await context.route('**/rest/v1/customer_inquiries?**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify([{id:'test-inquiry',category:'배송 문의',title:'배송 일정 및 상품 보관 방법에 관해 문의드립니다',contact_email:'long-customer-email@example.test',status:'pending',created_at:'2026-09-06T00:00:00Z',content:'문의 내용',user_id:adminUserId}])}));
 await context.route('**/rest/v1/partnership_inquiries?**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify([{id:'test-partnership',brand_name:'건강한 식탁을 만드는 브랜드',email:'partnership@example.test',proposal_type:'브랜드 입점',product_category:'건강식품',contact_name:'담당자',status:'new',created_at:'2026-09-06T00:00:00Z'}])}));

 await context.route('**/rest/v1/rpc/get_admin_sales_summary**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({daily:[],categories:[],best:[],previous:{total_payment:0,order_count:0,quantity:0},order_count:0,total_payment:0,quantity:0,average_payment:0,legacy_order_count:0})}));
 let activeRole='user';
 await context.route('**/rest/v1/profiles?**',route=>{
  const select=new URL(route.request().url()).searchParams.get('select')||'';
  const data=select.includes('role')?{display_name:'테스트 회원',primary_goal:'muscle_gain',role:activeRole}:select.includes('user_id')?[{user_id:adminUserId,display_name:'박용빈'}]:{phone:null,postal_code:null,address:null,address_detail:null};
  return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
 });
 const page=await context.newPage();
 const pageErrors=[]; page.on('pageerror',error=>pageErrors.push(error.message));

 for (const width of [320,390,596,768,1440]) {
  await page.setViewportSize({width,height:900});
  for(const path of ['/','/products','/products/1','/best','/new','/deals','/for-you','/cart','/checkout','/wishlist','/mypage','/orders','/support','/support/inquiry','/partners/proposal','/login','/register','/admin/orders','/admin/products','/admin/inquiries','/admin/partnerships','/admin','/admin/history']){
   activeRole=path.startsWith('/admin')?'admin':'user'; await page.goto(origin+path); await page.waitForTimeout(300); await page.locator('.app').waitFor({timeout:3000});
   const result=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1, offenders:[...document.querySelectorAll('body *')].filter(e=>{let r=e.getBoundingClientRect();return r.width && (r.right>innerWidth+2 || r.left < -2) && getComputedStyle(e).position!=='absolute'}).slice(0,8).map(e=>e.className), footer:document.querySelector('.footer')?.clientHeight}));
   assert.equal(result.overflow, false, JSON.stringify({width,path,...result}));
   if(path.startsWith('/admin/')) {
    const cards=await page.locator('.admin-mobile-cards').count();
    if(cards && width<=768)assert.equal(await page.locator('.admin-mobile-cards').evaluate(t=>t.scrollWidth>t.clientWidth+1),false,path);
   }
  }
 }
 assert.deepEqual(pageErrors, []);
 console.log('Mobile layout: 23 routes at 320, 390, 596, 768 and 1440px passed.');
} finally {await browser.close()}
