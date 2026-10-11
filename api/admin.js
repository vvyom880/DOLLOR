const crypto=require('crypto');
const REPO='vvyom880/DOLLOR';
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 const password=process.env.ADMIN_PASSWORD, token=process.env.GITHUB_TOKEN;
 if(!password||!token)return res.status(503).json({error:'Set ADMIN_PASSWORD and GITHUB_TOKEN in Vercel environment variables.'});
 const given=(req.headers.authorization||'').replace(/^Bearer /,'');
 const a=Buffer.from(given),b=Buffer.from(password);
 if(a.length!==b.length||!crypto.timingSafeEqual(a,b))return res.status(401).json({error:'Invalid admin password'});
 const call=async(path,opts={})=>{
  const r=await fetch('https://api.github.com/repos/'+REPO+'/contents/'+path,{...opts,headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json',...(opts.headers||{})}});
  const j=await r.json();if(!r.ok)throw Error(j.message||'GitHub request failed');return j;
 };
 try{
  if(req.method==='GET'){const f=await call('index.html?ref=main');return res.status(200).json({html:Buffer.from(f.content,'base64').toString('utf8'),sha:f.sha});}
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
  const body=typeof req.body==='string'?JSON.parse(req.body):req.body||{};
  if(body.action==='upload'){
   if(!/^image\/(png|jpeg|webp|gif)$/.test(body.mime||'')||!/^data:image\/(png|jpeg|webp|gif);base64,/.test(body.data||''))return res.status(400).json({error:'Only PNG, JPG, WebP or GIF images allowed'});
   const base64=body.data.split(',')[1];if(Buffer.byteLength(base64,'base64')>3*1024*1024)return res.status(413).json({error:'Max image size 3 MB'});
   const ext=body.mime.split('/')[1].replace('jpeg','jpg');const path='media/'+Date.now()+'-'+crypto.randomBytes(5).toString('hex')+'.'+ext;
   await call(path,{method:'PUT',body:JSON.stringify({message:'Upload website image',content:base64,branch:'main'})});
   return res.status(200).json({url:'/'+path});
  }
  if(body.action==='save'){
   if(typeof body.html!=='string'||body.html.length>500000||!body.html.includes('<!DOCTYPE html>')||!body.html.includes('id="track"'))return res.status(400).json({error:'Invalid website HTML'});
   const result=await call('index.html',{method:'PUT',body:JSON.stringify({message:'Update website content from admin panel',content:Buffer.from(body.html).toString('base64'),sha:body.sha,branch:'main'})});
   return res.status(200).json({sha:result.content.sha,commit:result.commit.sha});
  }
  return res.status(400).json({error:'Unknown action'});
 }catch(e){return res.status(500).json({error:e.message});}
};