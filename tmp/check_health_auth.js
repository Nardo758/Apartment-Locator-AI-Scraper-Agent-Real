import process from "node:process";
(async ()=>{
  const SUPABASE_URL='http://127.0.0.1:54321';
  const KEY=process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  for (const fn of ['ai-scraper-worker','scraper-worker','scheduled-scraper']){
    try{
      const res = await fetch(`${SUPABASE_URL}/functions/v1/${fn}/health`, { headers: { 'Authorization': `Bearer ${KEY}`, 'apikey': KEY } });
      console.log(fn, 'status', res.status);
      const txt = await res.text();
      console.log(txt.slice(0,400));
    } catch (e) {
      console.error(fn, 'call error', e.message);
    }
  }
})();
