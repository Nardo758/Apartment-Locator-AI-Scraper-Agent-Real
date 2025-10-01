const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function resetJobs() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  // Reset the first 3 failed jobs to pending status
  const { data: failedJobs, error: fetchError } = await supabase
    .from('scraping_queue')
    .select('id')
    .eq('status', 'failed')
    .limit(3);

  if (fetchError) {
    console.error('Error fetching failed jobs:', fetchError);
    return;
  }

  if (!failedJobs || failedJobs.length === 0) {
    console.log('No failed jobs to reset');
    return;
  }

  const jobIds = failedJobs.map(job => job.id);
  console.log(`Resetting jobs: ${jobIds.join(', ')}`);

  const { error: updateError } = await supabase
    .from('scraping_queue')
    .update({
      status: 'pending',
      error: null,
      started_at: null,
      completed_at: null
    })
    .in('id', jobIds);

  if (updateError) {
    console.error('Error resetting jobs:', updateError);
    return;
  }

  console.log(`✅ Successfully reset ${jobIds.length} jobs to pending status`);
}

resetJobs().catch(console.error);