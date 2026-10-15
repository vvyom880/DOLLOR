const crypto=require('crypto');
const ROOT=process.env.SUPABASE_URL,KEY=process.env.SUPABASE_SERVICE_ROLE_KEY;
function authorized(req){const expected=process.env.ADMIN_PASSWORD||'',got=String(req.headers.authorization||'').replace(/^Bearer /i,'');const a=Buffer.from(expected),b=Buffer.from(got);return !!expected&&a.length===b.length&&crypto.timingSafeEqual(a,b)}
const hash=code=>crypto.createHash('sha256').update(code).digest('hex');
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return res.status(405).json({error:'POST required'});
 if(!authorized(req))return res.status(401).json({error:'Admin authorization required'});
 if(!ROOT||!KEY)return res.status(503).json({error:'Database not configured'});
 try{
  const username=String(req.body?.username||'').trim();
  if(!/^[A-Za-z0-9_.-]{3,40}$/.test(username))return res.status(400).json({error:'Invalid username'});
  const base=ROOT.replace(/\/$/,'')+'/rest/v1/';const headers={apikey:KEY,Authorization:'Bearer '+KEY,'Content-Type':'application/json'};
  const u=await fetch(base+'lottery_users?select=id&username=ilike.'+encodeURIComponent(username)+'&limit=1',{headers});if(!u.ok)throw Error('User lookup failed');
  const users=await u.json();if(!users.length)return res.status(404).json({error:'User not found'});
  const code=crypto.randomBytes(18).toString('base64url');
  const r=await fetch(base+'lottery_lookup_codes?on_conflict=user_id',{method:'POST',headers:{...headers,Prefer:'resolution=merge-duplicates'},body:JSON.stringify({user_id:users[0].id,code_hash:hash(code),updated_at:new Date().toISOString()})});
  if(!r.ok)throw Error('Lookup code storage failed; run lookup-setup.sql');
  return res.status(200).json({username,lookup_code:code,message:'Save and share this code securely. Generating a new code invalidates the old one.'});
 }catch(e){console.error(e);return res.status(500).json({error:'Unable to generate lookup code'})}
};
