import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.production.real' });

const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const { data } = await client
    .from('scraping_queue')
    .select('id, url, status, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

console.log('\nLatest 10 queue items:\n');
data?.forEach(d => {
    console.log(`ID ${d.id}: [${d.status}] ${d.url.substring(0, 60)}...`);
});
