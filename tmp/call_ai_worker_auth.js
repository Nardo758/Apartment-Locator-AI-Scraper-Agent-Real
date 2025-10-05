(async ()=>{
  const SUPABASE_URL='http://127.0.0.1:54321';
  const KEY=process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const payload={ urls:['https://www.amli.com/apartments/atlanta/midtown-apartments/amli-arts-center'], property_source_id:1234, claude_analysis:false, metadata:{property_name:'AMLI Arts Center',website_name:'amli'} };
  try{
    const res = await fetch(`${SUPABASE_URL}/functions/v1/ai-scraper-worker`, { method:'POST', headers:{ 'Content-Type':'application/json', 'Authorization': `Bearer ${KEY}`, 'apikey': KEY }, body: JSON.stringify(payload) });
    console.log('STATUS', res.status);
    const txt = await res.text();
    try{ console.log(JSON.parse(txt)); } catch(e){ console.log(txt.slice(0,200)); }
  } catch(e){ console.error('CALL ERROR', e); }
})();
