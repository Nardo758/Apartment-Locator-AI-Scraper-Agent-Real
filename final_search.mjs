import dotenv from 'dotenv';
dotenv.config();
const r = await fetch('https://jdymvpasjsdbryatscux.supabase.co/functions/v1/claude-queue-builder', { 
    method: 'POST', 
    headers: { 
        'Authorization': 'Bearer ' + process.env.SUPABASE_SERVICE_ROLE_KEY, 
        'Content-Type': 'application/json' 
    }, 
    body: JSON.stringify({ 
        query: 'buckhead apartments', 
        location: 'Atlanta, GA', 
        num_results: 5, 
        use_claude: true 
    }) 
}); 
const d = await r.json(); 
console.log('✅ Found:', d.search?.numResults, '| Saved:', d.persisted?.filter(p=>p.status==='enqueued_via_rpc' || p.status==='persisted').length);
console.log('\n🎉 Total discovered: 18 + ' + (d.persisted?.filter(p=>p.status==='enqueued_via_rpc' || p.status==='persisted').length || 0) + ' = ' + (18 + (d.persisted?.filter(p=>p.status==='enqueued_via_rpc' || p.status==='persisted').length || 0)) + ' properties!\n');
