const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function checkJobs() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const { data: jobs, error } = await supabase
    .from('scraping_queue')
    .select('id, url, status, error')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Recent jobs:');
  jobs?.forEach(job => {
    console.log(`${job.id}: ${job.status} - ${job.url?.substring(0, 50)}...`);
    if (job.error) console.log(`  Error: ${job.error.substring(0, 100)}...`);
  });

  // Count by status
  const statusCounts = jobs?.reduce((acc, job) => {
    acc[job.status] = (acc[job.status] || 0) + 1;
    return acc;
  }, {});

  console.log('\nStatus counts:', statusCounts);
}

checkJobs().catch(console.error);