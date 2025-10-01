const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://jdymvpasjsdbryatscux.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkeW12cGFzanNkYnJ5YXRzY3V4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1ODc1NTgsImV4cCI6MjA3NDE2MzU1OH0.Y88-nn2LDE6qZ4p69rFuOCjM6ES027WXs-T_4g7DTso'
);

async function debugSaving() {
  console.log('🔍 Debugging data saving issue...\n');

  // Check environment variables
  console.log('📋 Environment Variables:');
  console.log('ENABLE_FRONTEND_SYNC:', process.env.ENABLE_FRONTEND_SYNC || 'not set');

  // Check the queue entry
  console.log('\n📊 Queue Entry:');
  const { data: queue, error: queueError } = await supabase
    .from('scraping_queue')
    .select('*')
    .eq('id', 69);

  if (queueError) {
    console.error('❌ Queue error:', queueError);
  } else if (queue && queue.length > 0) {
    const job = queue[0];
    console.log(`ID: ${job.id}`);
    console.log(`Status: ${job.status}`);
    console.log(`External ID: ${job.external_id}`);
    console.log(`Property ID: ${job.property_id}`);
    console.log(`Unit Number: ${job.unit_number}`);
    console.log(`Error: ${job.error || 'None'}`);
  }

  // Try to manually insert test data to see if the table works
  console.log('\n🧪 Testing manual insert to scraped_properties:');
  const testData = {
    property_id: 'test_sentral_1759281316925',
    unit_number: '1',
    source: 'test_manual',
    name: 'Sentral West Midtown - Test',
    address: '123 Test St',
    city: 'Atlanta',
    state: 'GA',
    current_price: 1500,
    bedrooms: 1,
    bathrooms: 1.0,
    listing_url: 'https://www.sentral.com/atlanta/west-midtown'
  };

  const { data: insertResult, error: insertError } = await supabase
    .from('scraped_properties')
    .insert(testData)
    .select();

  if (insertError) {
    console.error('❌ Manual insert failed:', insertError);
  } else {
    console.log('✅ Manual insert succeeded:', insertResult);
  }
}

debugSaving().catch(console.error);