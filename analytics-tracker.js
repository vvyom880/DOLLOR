(function(){
 if(navigator.doNotTrack==='1'||navigator.globalPrivacyControl===true)return;
 const key='dollor_visitor_v1',sessionKey='dollor_session_v1';
 const uid=()=>{try{return crypto.randomUUID()}catch{return Date.now().toString(36)+Math.random().toString(36).slice(2)}};
 function get(k,store){try{let v=store.getItem(k);if(!v){v=uid();store.setItem(k,v)}return v}catch{return uid()}}
 const visitor_id=get(key,localStorage),session_id=get(sessionKey,sessionStorage),seen=new Set();
 function section(el){const p=el.closest('section[id],footer[id],header[id],section,footer,header,[id]');return p?(p.id||p.tagName.toLowerCase()):'page'}
 function identify(el){const sec=section(el),tag=el.tagName.toLowerCase(),txt=(el.getAttribute('aria-label')||el.textContent||el.alt||'').trim().replace(/\s+/g,' ').slice(0,120);let id=el.id||el.getAttribute('data-analytics-id')||'';if(!id){const parent=el.parentElement;const same=parent?[...parent.children].filter(x=>x.tagName===el.tagName):[];id=sec+'::'+tag+'::'+(same.indexOf(el)+1)+'::'+txt.slice(0,55)}return {section_id:sec,element_id:id,element_label:txt,element_type:tag,element_url:(el.getAttribute('href')||'').slice(0,400)}}
 function send(event_type,details){const data=JSON.stringify({event_type,visitor_id,session_id,page_path:location.pathname+location.hash,...details});try{if(navigator.sendBeacon){navigator.sendBeacon('/api/track',new Blob([data],{type:'application/json'}));return}}catch{}fetch('/api/track',{method:'POST',headers:{'Content-Type':'application/json'},body:data,keepalive:true}).catch(()=>{})}
 send('page_view',{element_id:'page:'+location.pathname,element_label:document.title,section_id:'page'});
 document.addEventListener('click',function(e){const el=e.target.closest('a,button,[role="button"],summary');if(!el)return;send('click',identify(el))},true);
 const io='IntersectionObserver' in window?new IntersectionObserver(entries=>entries.forEach(entry=>{if(!entry.isIntersecting)return;const el=entry.target,d=identify(el),k=d.element_id+'|'+d.section_id;if(!seen.has(k)){seen.add(k);send('impression',d)}io.unobserve(el)}),{threshold:.3}):null;
 function scan(){if(!io)return;document.querySelectorAll('.slide, [data-banner-url], .banner, .hero-banner').forEach(el=>{if(el.dataset.analyticsObserved)return;el.dataset.analyticsObserved='1';if(!el.id)el.dataset.analyticsId='banner::'+[...el.parentElement.children].indexOf(el);io.observe(el)})}
 scan();new MutationObserver(scan).observe(document.body,{childList:true,subtree:true});
 window.addEventListener('hashchange',()=>send('page_view',{element_id:'page:'+location.pathname+location.hash,section_id:'page',element_label:document.title}));
})();