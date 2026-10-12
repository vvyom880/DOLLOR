export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET')return res.status(405).end();
 const secret=process.env.ANALYTICS_DASHBOARD_KEY;
 const supplied=String(req.headers.authorization||'').replace(/^Bearer /i,'');
 if(!secret||!supplied||supplied!==secret)return res.status(401).json({error:'Unauthorized'});
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)return res.status(503).json({error:'Analytics storage not configured'});
 const now=new Date();let from=new Date(now),to=new Date(now);
 const period=String(req.query.period||'today');
 const startDay=d=>{d.setHours(0,0,0,0);return d};
 if(period==='yesterday'){startDay(from);from.setDate(from.getDate()-1);startDay(to)}
 else if(period==='weekly'){startDay(from);from.setDate(from.getDate()-6);to=new Date()}
 else if(period==='monthly'){startDay(from);from.setDate(from.getDate()-29);to=new Date()}
 else if(period==='custom'){from=new Date(String(req.query.from||''));to=new Date(String(req.query.to||'')+'T23:59:59.999Z');if(!Number.isFinite(+from)||!Number.isFinite(+to))return res.status(400).json({error:'Invalid dates'})}
 else{startDay(from);to=new Date()}
 if(to<from||to-from>1000*60*60*24*366)return res.status(400).json({error:'Date range must be within 366 days'});
 const out=[];let offset=0;const batch=1000;let truncated=false;
 try{
  for(let i=0;i<50;i++){const query=new URLSearchParams({select:'occurred_at,visitor_id,event_type,page_path,section_id,element_id,element_label,element_type,element_url',occurred_at:'gte.'+from.toISOString(),order:'occurred_at.asc',offset:String(offset),limit:String(batch)});
  const endpoint=url.replace(/\/$/,'')+'/rest/v1/site_analytics_events?'+query.toString()+'&occurred_at=lte.'+encodeURIComponent(to.toISOString());
  const r=await fetch(endpoint,{headers:{apikey:key,Authorization:'Bearer '+key}});if(!r.ok)throw Error(await r.text());const rows=await r.json();out.push(...rows);if(rows.length<batch)break;offset+=batch;if(i===49)truncated=true}
  return res.status(200).json({events:out,truncated,from:from.toISOString(),to:to.toISOString()})
 }catch(e){return res.status(502).json({error:'Could not read analytics'})}
}