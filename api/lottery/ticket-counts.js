const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const validDate = s => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0,10) === s;
module.exports = async (req,res) => {
  res.setHeader('Cache-Control','no-store');
  if(req.method !== 'GET') return res.status(405).json({error:'GET required'});
  try {
    const username = String(req.query.username||'').trim();
    const from = String(req.query.from||'');
    const to = String(req.query.to||'');
    if(!/^[A-Za-z0-9_.-]{3,40}$/.test(username)) return res.status(400).json({error:'Invalid username'});
    if(!validDate(from)||!validDate(to)) return res.status(400).json({error:'Invalid date'});
    const days = (Date.parse(to)-Date.parse(from))/86400000+1;
    if(days < 1 || days > 30) return res.status(400).json({error:'Select 1 to 30 days'});
    if(!URL||!KEY) return res.status(503).json({error:'Database configuration missing'});
    const root = URL.replace(/\/$/,'')+'/rest/v1/';
    const headers = {apikey:KEY,Authorization:'Bearer '+KEY};
    const usersRes = await fetch(root+'lottery_users?select=id&username=ilike.'+encodeURIComponent(username)+'&limit=1',{headers});
    if(!usersRes.ok) throw new Error('User query failed');
    const users = await usersRes.json();
    if(!users.length) return res.status(200).json({total:0,days:[]});
    const counts = new Map();
    let offset=0;
    while(true) {
      const params = new URLSearchParams({select:'ticket_date',user_id:'eq.'+users[0].id,order:'ticket_date.asc',limit:'1000',offset:String(offset)});
      params.append('ticket_date','gte.'+from);
      params.append('ticket_date','lte.'+to);
      const response = await fetch(root+'lottery_tickets?'+params.toString(),{headers});
      if(!response.ok) throw new Error('Ticket query failed');
      const rows=await response.json();
      for(const row of rows) counts.set(row.ticket_date,(counts.get(row.ticket_date)||0)+1);
      offset+=rows.length;
      if(rows.length<1000) break;
      if(offset>=100000) return res.status(413).json({error:'Too many tickets in range'});
    }
    return res.status(200).json({total:offset,days:[...counts].map(([date,count])=>({date,count}))});
  } catch(err) {
    console.error('Ticket count lookup failed',err);
    return res.status(500).json({error:'Unable to load ticket counts'});
  }
};
