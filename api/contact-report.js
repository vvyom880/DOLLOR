export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
 const secret=process.env.ANALYTICS_DASHBOARD_KEY;
 const supplied=String(req.headers.authorization||'').replace(/^Bearer /i,'');
 if(!secret||!supplied||supplied!==secret)return res.status(401).json({error:'Unauthorized'});
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)return res.status(503).json({error:'Supabase not configured'});
 const from=String(req.query.from||''),to=String(req.query.to||'');
 if((from&&!/^\d{4}-\d{2}-\d{2}$/.test(from))||(to&&!/^\d{4}-\d{2}-\d{2}$/.test(to)))return res.status(400).json({error:'Invalid date format'});
 if(from&&to&&from>to)return res.status(400).json({error:'Start date must be before end date'});
 const params=new URLSearchParams({select:'id,created_at,first_name,last_name,email,phone_country_code,phone_number,message',order:'created_at.desc',limit:'1000'});
 if(from)params.append('created_at','gte.'+from+'T00:00:00Z');
 if(to)params.append('created_at','lte.'+to+'T23:59:59.999Z');
 try{
  const all=[];for(let page=0;page<50;page++){params.set('offset',String(page*1000));const r=await fetch(url.replace(/\/$/,'')+'/rest/v1/contact_messages?'+params,{headers:{apikey:key,Authorization:'Bearer '+key}});if(!r.ok)throw Error('Supabase read failed');const rows=await r.json();all.push(...rows);if(rows.length<1000)return res.status(200).json({messages:all,truncated:false})}
  return res.status(200).json({messages:all,truncated:true});
 }catch{return res.status(502).json({error:'Could not load messages'})}
}