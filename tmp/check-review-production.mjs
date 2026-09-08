import fs from 'node:fs';
const env=Object.fromEntries(fs.readFileSync('.env.local','utf8').split(/\r?\n/).filter(x=>x.includes('=')).map(x=>{let i=x.indexOf('=');return [x.slice(0,i),x.slice(i+1).trim().replace(/^['"]|['"]$/g,'')]}));
const url=env.VITE_SUPABASE_URL,key=env.VITE_SUPABASE_PUBLISHABLE_KEY;
const auth=await fetch(url+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify({email:env.RLS_ADMIN_EMAIL,password:env.RLS_ADMIN_PASSWORD})});const session=await auth.json();
if(!auth.ok) throw new Error('Admin auth failed '+auth.status);
const result=await fetch(url+'/rest/v1/rpc/get_admin_review_reports',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:'{}'}); const data=await result.json();
console.log({adminReportsStatus:result.status,count:Array.isArray(data)?data.length:null,errorCode:data.code});
const anon=await fetch(url+'/rest/v1/rpc/get_admin_review_reports',{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:'{}'});console.log({anonymousReportsStatus:anon.status});
