import fs from 'node:fs'
const env = Object.fromEntries(fs.readFileSync('.env.local','utf8').split(/\r?\n/).filter(line => /^[A-Z_]+=/.test(line)).map(line => { const i=line.indexOf('='); return [line.slice(0,i),line.slice(i+1).trim().replace(/^['"]|['"]$/g,'')] }))
const url=env.VITE_SUPABASE_URL, key=env.VITE_SUPABASE_PUBLISHABLE_KEY
const preflight=await fetch(url+'/functions/v1/ai-insights',{method:'OPTIONS',headers:{Origin:'http://localhost:5173','Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'authorization,apikey,content-type'}})
console.log(JSON.stringify({probe:'preflight',status:preflight.status,allowOrigin:preflight.headers.get('access-control-allow-origin')}))
for (const who of ['A','B']) {
 const auth=await fetch(url+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify({email:env[`RLS_USER_${who}_EMAIL`],password:env[`RLS_USER_${who}_PASSWORD`]})})
 const session=await auth.json()
 if(!auth.ok){console.log(JSON.stringify({probe:who,authStatus:auth.status,code:session.error_code})); continue}
 const response=await fetch(url+'/functions/v1/ai-insights',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+session.access_token,'Content-Type':'application/json',Origin:'http://localhost:5173'},body:JSON.stringify({mode:'cart_summary'})})
 const data=await response.json()
 console.log(JSON.stringify({probe:who,status:response.status,error:data.error||data.message,compositionVersion:data.insight?.compositionVersion,analysisVersion:data.insight?.analysisVersion,aiExplanationAvailable:data.insight?.aiExplanationAvailable,itemCount:data.insight?.productReasons?.length,keys:Object.keys(data.insight||{})}))
}
