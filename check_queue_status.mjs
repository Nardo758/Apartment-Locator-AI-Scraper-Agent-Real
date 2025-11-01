import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const REMOTE_URL = 'https://jdymvpasjsdbryatscux.supabase.co';
const LOCAL_URL = 'http://127.0.0.1:54380';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('\nChecking Queue Status (Remote vs Local)\n');
console.log('='.repeat(70));

// Check remote
const remoteClient = createClient(REMOTE_URL, SERVICE_KEY);
const { data: remoteQueue, error: remoteError } = await remoteClient
    .from('scraping_queue')
    .select('id, url, status, source')
    .eq('status', 'queued');

console.log('\nREMOTE Database (Production):');
if (remoteError) {
    console.log('   Error:', remoteError.message);
} else {
    console.log(`   Queued properties: ${remoteQueue?.length || 0}`);
    if (remoteQueue && remoteQueue.length > 0) {
        remoteQueue.slice(0, 5).forEach((q, i) => {
            console.log(`   ${i + 1}. [${q.source}] ${q.url}`);
        });
    }
}

// Check property_sources
const { data: remoteSources } = await remoteClient
    .from('property_sources')
    .select('id, url, property_name')
    .order('created_at', { ascending: false })
    .limit(5);

console.log(`\n   property_sources: ${remoteSources?.length || 0} (showing latest 5)`);
if (remoteSources && remoteSources.length > 0) {
    remoteSources.forEach((s, i) => {
        console.log(`   ${i + 1}. ${s.property_name || 'No name'} - ${s.url}`);
    });
}

console.log('\n' + '='.repeat(70));
console.log('\nSummary: Properties are in property_sources, need to be queued for scraping\n');
