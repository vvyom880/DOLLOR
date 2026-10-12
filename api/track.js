export default async function handler(req,res){
 if(req.method!=='POST')return res.status(405).end();
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)return res.status(503).json({error:'Storage not configured'});
 let b=req.body||{};if(typeof b==='string'){try{b=JSON.parse(b)}catch{return res.status(400).end()}}
 if(!['page_view','impression','click'].includes(b.event_type)||typeof b.visitor_id!=='string'||b.visitor_id.length>100)return res.status(400).end();
 const clip=(v,n=200)=>String(v||'').slice(0,n);
 const data={event_type:b.event_type,visitor_id:clip(b.visitor_id,100),session_id:clip(b.session_id,100),page_path:clip(b.page_path,300),section_id:clip(b.section_id),element_id:clip(b.element_id),element_label:clip(b.element_label),element_type:clip(b.element_type,60),element_url:clip(b.element_url,400)};
 try{const r=await fetch(url.replace(/\/$/,'')+'/rest/v1/site_analytics_events',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json','Prefer':'return=minimal'},body:JSON.stringify(data)});if(!r.ok)throw Error('Database write failed');return res.status(204).end()}catch{return res.status(502).json({error:'Storage unavailable'})}
}