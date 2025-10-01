const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function resetOneJob() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  // Reset just one job for testing
  const { data: failedJobs, error: fetchError } = await supabase
    .from('scraping_queue')
    .select('id')
    .eq('status', 'failed')
    .limit(1);

  if (fetchError) {
    console.error('Error fetching failed jobs:', fetchError);
    return;
  }

  if (!failedJobs || failedJobs.length === 0) {
    console.log('No failed jobs to reset');
    return;
  }

  const jobId = failedJobs[0].id;
  console.log(`Resetting job: ${jobId}`);

  const { error: updateError } = await supabase
    .from('scraping_queue')
    .update({
      status: 'pending',
      error: null,
      started_at: null,
      completed_at: null
    })
    .eq('id', jobId);

  if (updateError) {
    console.error('Error resetting job:', updateError);
    return;
  }

  console.log(`✅ Successfully reset job ${jobId} to pending status`);
}

resetOneJob().catch(console.error);