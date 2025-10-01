const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://jdymvpasjsdbryatscux.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkeW12cGFzanNkYnJ5YXRzY3V4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1ODc1NTgsImV4cCI6MjA3NDE2MzU1OH0.Y88-nn2LDE6qZ4p69rFuOCjM6ES027WXs-T_4g7DTso'
);

async function checkQueue() {
  console.log('🔍 Checking scraping queue for Sentral job...\n');

  const { data: queue, error } = await supabase
    .from('scraping_queue')
    .select('*')
    .ilike('url', '%sentral%')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('❌ Error:', error);
  } else if (queue && queue.length > 0) {
    console.log('📋 Queue status:');
    queue.forEach(job => {
      console.log(`🏷️  Job ID: ${job.id}`);
      console.log(`🔗 URL: ${job.url}`);
      console.log(`📊 Status: ${job.status}`);
      console.log(`❌ Error: ${job.error || 'None'}`);
      console.log(`✅ Completed: ${job.completed_at || 'Not completed'}`);
      console.log(`🕒 Started: ${job.started_at || 'Not started'}`);
      console.log(`📝 External ID: ${job.external_id}`);
      console.log(`🏢 Property ID: ${job.property_id}`);
      console.log(`🔢 Unit Number: ${job.unit_number}`);
      console.log('');
    });
  } else {
    console.log('❌ No Sentral jobs found in queue');
  }

  // Also check recent completed jobs
  console.log('📈 Recent completed jobs:');
  const { data: recent, error: recentError } = await supabase
    .from('scraping_queue')
    .select('id, url, status, completed_at')
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(10);

  if (recentError) {
    console.error('❌ Error fetching recent jobs:', recentError);
  } else if (recent && recent.length > 0) {
    recent.forEach(job => {
      console.log(`   ✅ ${job.id}: ${job.url.split('/').pop()} - ${job.completed_at}`);
    });
  } else {
    console.log('   No recently completed jobs found');
  }
}

checkQueue().catch(console.error);