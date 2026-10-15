const crypto=require('crypto');
const ROOT=process.env.SUPABASE_URL,KEY=process.env.SUPABASE_SERVICE_ROLE_KEY;
const validDate=s=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return res.status(405).json({error:'POST required'});
 try{
  const {username:raw,lookup_code:rawCode,from,to}=req.body||{};
  const username=String(raw||'').trim(),code=String(rawCode||'');
  if(!/^[A-Za-z0-9_.-]{3,40}$/.test(username)||!(/^[A-Za-z0-9_-]{24}$/.test(code)))return res.status(400).json({error:'Invalid username or lookup code'});
  if(!validDate(from)||!validDate(to))return res.status(400).json({error:'Invalid dates'});
  const days=(Date.parse(to)-Date.parse(from))/86400000+1;
  if(days<1||days>30)return res.status(400).json({error:'Select 1–30 calendar days'});
  if(!ROOT||!KEY)return res.status(503).json({error:'Database not configured'});
  const base=ROOT.replace(/\/$/,'')+'/rest/v1/',headers={apikey:KEY,Authorization:'Bearer '+KEY};
  const u=await fetch(base+'lottery_users?select=id&username=ilike.'+encodeURIComponent(username)+'&limit=1',{headers});if(!u.ok)throw Error('User lookup failed');
  const users=await u.json();
  if(!users.length)return res.status(403).json({error:'Username or lookup code incorrect'});
  const c=await fetch(base+'lottery_lookup_codes?select=code_hash&user_id=eq.'+users[0].id+'&limit=1',{headers});if(!c.ok)throw Error('Lookup configuration missing');
  const codes=await c.json(),provided=Buffer.from(hash(code),'hex'),expected=Buffer.from(codes[0]?.code_hash||'0'.repeat(64),'hex');
  if(!codes.length||!crypto.timingSafeEqual(provided,expected))return res.status(403).json({error:'Username or lookup code incorrect'});
  const tickets=[];let offset=0;
  while(true){
   const qs=new URLSearchParams({select:'ticket_date,ticket_number,status',user_id:'eq.'+users[0].id,order:'ticket_date.desc,ticket_number.asc',limit:'1000',offset:String(offset)});
   qs.append('ticket_date','gte.'+from);qs.append('ticket_date','lte.'+to);
   const r=await fetch(base+'lottery_tickets?'+qs,{headers});if(!r.ok)throw Error('Tickets query failed');
   const rows=await r.json();tickets.push(...rows);offset+=rows.length;
   if(rows.length<1000)break;
   if(offset>=10000)return res.status(413).json({error:'Too many tickets; select a shorter date range'});
  }
  return res.status(200).json({total:tickets.length,tickets});
 }catch(e){console.error('Ticket lookup failed',e);return res.status(500).json({error:'Unable to load tickets'})}
};
