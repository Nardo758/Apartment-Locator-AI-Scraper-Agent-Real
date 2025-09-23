const { createClient } = require('@supabase/supabase-js');
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }
const supabase = createClient(url, key);
(async function(){
  try {
    const { data, error } = await supabase.rpc('get_next_scraping_batch', { batch_size: 1 });
    if (error) { console.error('RPC error', error); process.exit(1); }
    console.log('get_next_scraping_batch result:', data);
  } catch (e) {
    console.error('Unexpected', e);
  }
})();
