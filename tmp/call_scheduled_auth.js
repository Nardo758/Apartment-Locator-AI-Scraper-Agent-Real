(async ()=>{
  const SUPABASE_URL='http://127.0.0.1:54321';
  const KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
  try{
    const res = await fetch(`${SUPABASE_URL}/functions/v1/scheduled-scraper`,{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':`Bearer ${KEY}`,'apikey':KEY},
      body: JSON.stringify({force:true,batch_size:20,region:'atlanta'})
    });
    console.log('STATUS', res.status);
    const txt = await res.text();
    try{ console.log(JSON.parse(txt)); } catch(e){ console.log(txt); }
  } catch(e) { console.error('CALL ERROR', e); process.exit(1); }
})();
