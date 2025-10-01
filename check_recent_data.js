const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://jdymvpasjsdbryatscux.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkeW12cGFzanNkYnJ5YXRzY3V4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1ODc1NTgsImV4cCI6MjA3NDE2MzU1OH0.Y88-nn2LDE6qZ4p69rFuOCjM6ES027WXs-T_4g7DTso'
);

async function checkRecentData() {
  console.log('🔍 Checking for any recently added data...\n');

  // Check most recent scraped_properties
  console.log('📊 Most recent scraped_properties:');
  const { data: recentScraped, error: scrapedError } = await supabase
    .from('scraped_properties')
    .select('name, address, city, state, current_price, created_at, external_id')
    .order('created_at', { ascending: false })
    .limit(10);

  if (scrapedError) {
    console.error('❌ Error fetching scraped data:', scrapedError);
  } else if (recentScraped && recentScraped.length > 0) {
    recentScraped.forEach((prop, i) => {
      console.log(`   ${i+1}. ${prop.name} - ${prop.city}, ${prop.state} - $${prop.current_price} (${new Date(prop.created_at).toLocaleString()})`);
      console.log(`      External ID: ${prop.external_id}`);
    });
  } else {
    console.log('   No data found in scraped_properties table');
  }

  // Check most recent properties
  console.log('\n🏠 Most recent properties:');
  const { data: recentProps, error: propsError } = await supabase
    .from('properties')
    .select('name, address, city, state, original_price, created_at, external_id')
    .order('created_at', { ascending: false })
    .limit(10);

  if (propsError) {
    console.error('❌ Error fetching properties data:', propsError);
  } else if (recentProps && recentProps.length > 0) {
    recentProps.forEach((prop, i) => {
      console.log(`   ${i+1}. ${prop.name} - ${prop.city}, ${prop.state} - $${prop.original_price} (${new Date(prop.created_at).toLocaleString()})`);
      console.log(`      External ID: ${prop.external_id}`);
    });
  } else {
    console.log('   No data found in properties table');
  }

  // Check if there are any properties with the Sentral external ID
  console.log('\n🔍 Searching for Sentral external ID:');
  const sentralExternalId = 'test_sentral_1759281316925_1';

  const { data: sentralData, error: sentralError } = await supabase
    .from('scraped_properties')
    .select('*')
    .eq('external_id', sentralExternalId);

  if (sentralError) {
    console.error('❌ Error searching for Sentral data:', sentralError);
  } else if (sentralData && sentralData.length > 0) {
    console.log('✅ Found Sentral data:');
    console.log(JSON.stringify(sentralData[0], null, 2));
  } else {
    console.log('❌ No Sentral data found with exact external ID');
  }
}

checkRecentData().catch(console.error);