import { analyzeCartNutrition, composeCartInsight, cartAnalysisBasis, reconcileCartInsight } from '../supabase/functions/_shared/cart-nutrition-analysis.js'
import fs from 'node:fs'
const env = Object.fromEntries(fs.readFileSync('.env.local','utf8').split(/\r?\n/).filter(line => /^[A-Z_]+=/.test(line)).map(line => { const i=line.indexOf('='); return [line.slice(0,i),line.slice(i+1).trim().replace(/^['"]|['"]$/g,'')] }))
const url=env.VITE_SUPABASE_URL, key=env.VITE_SUPABASE_PUBLISHABLE_KEY
const preflight=await fetch(url+'/functions/v1/ai-insights',{method:'OPTIONS',headers:{Origin:'http://localhost:5173','Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'authorization,apikey,content-type'}})
console.log(JSON.stringify({probe:'preflight',status:preflight.status,allowOrigin:preflight.headers.get('access-control-allow-origin')}))
for (const who of ['ADMIN']) {
 const auth=await fetch(url+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify({email:env[`RLS_${who}_EMAIL`],password:env[`RLS_${who}_PASSWORD`]})})
 const session=await auth.json()
 if(!auth.ok){console.log(JSON.stringify({probe:who,authStatus:auth.status,code:session.error_code})); continue}
 const response=await fetch(url+'/functions/v1/ai-insights',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+session.access_token,'Content-Type':'application/json',Origin:'http://localhost:5173'},body:JSON.stringify({mode:'cart_summary'})})
 const data=await response.json()
 const headers = { apikey:key, Authorization:'Bearer '+session.access_token }
 const read = async path => { const res=await fetch(url+'/rest/v1/'+path+'&user_id=eq.'+session.user.id,{headers}); if(!res.ok) throw new Error('Snapshot read failed '+res.status); return res.json() }
 const [cart, profiles, prefs] = await Promise.all([read('cart_items?select=quantity,product:products(*)'),read('profiles?select=primary_goal'),read('user_preferences?select=low_sugar,low_sodium,high_protein,exclude_caffeine,excluded_allergens')])
 const context={primaryGoal:profiles[0]?.primary_goal,selectedConditions:['low_sugar','low_sodium','high_protein','exclude_caffeine'].filter(k=>prefs[0]?.[k]),excludedAllergens:prefs[0]?.excluded_allergens||[]}
 const current=composeCartInsight(analyzeCartNutrition(cart,context),cartAnalysisBasis(context))
 const normalized=reconcileCartInsight(data.insight,current)
 console.log(JSON.stringify({compatible:Boolean(normalized),serverVersion:data.insight?.compositionVersion,clientVersion:normalized?.compositionVersion,aiExplanationAvailable:normalized?.aiExplanationAvailable,aiSummaryPreserved:normalized?.summary===data.insight?.summary,connectionFallback:normalized?.explanationNotice?.includes('AI 연결'),clientMetrics:current.balanceItems.map(m=>[m.key,m.count,m.total]),serverMetrics:data.insight?.balanceItems.map(m=>[m.key,m.count,m.total]),sameMetrics:JSON.stringify(current.balanceItems.map(m=>[m.key,m.count,m.total]))===JSON.stringify(data.insight?.balanceItems.map(m=>[m.key,m.count,m.total]))}))
 console.log(JSON.stringify({probe:who,status:response.status,error:data.error||data.message,compositionVersion:data.insight?.compositionVersion,analysisVersion:data.insight?.analysisVersion,aiExplanationAvailable:data.insight?.aiExplanationAvailable,itemCount:data.insight?.productReasons?.length,keys:Object.keys(data.insight||{})}))
}



