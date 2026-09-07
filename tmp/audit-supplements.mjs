import fs from 'node:fs'
import { measuredSupplementIngredients } from '../supabase/functions/_shared/product-type.js'
const env = Object.fromEntries(fs.readFileSync('.env.local','utf8').split(/\r?\n/).filter(s=>s.includes('=')).map(s=>{ const i=s.indexOf('=');return [s.slice(0,i),s.slice(i+1).trim().replace(/^['"]|['"]$/g,'')] }))
const response = await fetch(env.VITE_SUPABASE_URL+'/rest/v1/products?select=product_id,name,category,main_ingredients,serving_size&category=eq.'+encodeURIComponent('영양제·비타민'),{headers:{apikey:env.VITE_SUPABASE_PUBLISHABLE_KEY}})
if(!response.ok) throw new Error('read-only audit HTTP '+response.status)
const products=await response.json()
fs.writeFileSync('tmp/supplement-ux-db-audit.json',JSON.stringify(products,null,2))
console.log(JSON.stringify({total:products.length,measured:products.filter(p=>measuredSupplementIngredients(p).length).length,missing:products.filter(p=>!measuredSupplementIngredients(p).length).map(p=>({id:p.product_id,name:p.name}))}))
