const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://jdymvpasjsdbryatscux.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkeW12cGFzanNkYnJ5YXRzY3V4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1ODc1NTgsImV4cCI6MjA3NDE2MzU1OH0.Y88-nn2LDE6qZ4p69rFuOCjM6ES027WXs-T_4g7DTso'
);

async function resetJob() {
  console.log('🔄 Resetting Sentral job to pending...');

  const { error } = await supabase
    .from('scraping_queue')
    .update({
      status: 'pending',
      completed_at: null,
      error: null
    })
    .eq('id', 69);

  if (error) {
    console.error('❌ Error resetting job:', error);
  } else {
    console.log('✅ Job 69 reset to pending status');
  }
}

resetJob().catch(console.error);