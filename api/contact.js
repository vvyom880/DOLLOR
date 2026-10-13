export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)return res.status(503).json({error:'Contact form not configured'});
 let b=req.body||{};if(typeof b==='string'){try{b=JSON.parse(b)}catch{return res.status(400).json({error:'Invalid request'})}}
 const first_name=String(b.first_name||'').trim().slice(0,80),last_name=String(b.last_name||'').trim().slice(0,80),email=String(b.email||'').trim().toLowerCase().slice(0,254),phone_country_code=String(b.phone_country_code||'').trim(),phone_number=String(b.phone_number||'').trim(),message=String(b.message||'').trim().slice(0,3000);
 if(!first_name||!last_name||!message||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!/^[+]\d{1,4}$/.test(phone_country_code)||!/^[0-9]{10}$/.test(phone_number))return res.status(400).json({error:'Please enter valid details and a 10-digit phone number'});
 try{
  const r=await fetch(url.replace(/\/$/,'')+'/rest/v1/contact_messages',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json','Prefer':'return=minimal'},body:JSON.stringify({first_name,last_name,email,phone_country_code,phone_number,message})});
  if(r.status===409)return res.status(409).json({error:'This email address or phone number has already submitted a message'});
  if(!r.ok)return res.status(502).json({error:'Unable to save message. Please try later'});
  return res.status(201).json({ok:true,message:'Your message has been submitted successfully'});
 }catch{return res.status(502).json({error:'Unable to submit right now'})}
}
