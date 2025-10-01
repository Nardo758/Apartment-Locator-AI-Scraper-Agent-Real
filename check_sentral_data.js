const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://jdymvpasjsdbryatscux.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkeW12cGFzanNkYnJ5YXRzY3V4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1ODc1NTgsImV4cCI6MjA3NDE2MzU1OH0.Y88-nn2LDE6qZ4p69rFuOCjM6ES027WXs-T_4g7DTso'
);

async function checkSentralData() {
  console.log('🔍 Checking data for Sentral West Midtown...\n');

  // Check scraped_properties table
  console.log('📊 SCRAPED_PROPERTIES TABLE:');
  const { data: scraped, error: scrapedError } = await supabase
    .from('scraped_properties')
    .select('*')
    .ilike('name', '%sentral%')
    .order('created_at', { ascending: false })
    .limit(5);

  if (scrapedError) {
    console.error('❌ Error fetching scraped data:', scrapedError);
  } else if (scraped && scraped.length > 0) {
    scraped.forEach((property, index) => {
      console.log(`\n🏢 Property ${index + 1}:`);
      console.log(`   Name: ${property.name}`);
      console.log(`   Address: ${property.address}`);
      console.log(`   City: ${property.city}, ${property.state}`);
      console.log(`   Price: $${property.current_price}`);
      console.log(`   Bedrooms: ${property.bedrooms}, Bathrooms: ${property.bathrooms}`);
      console.log(`   Square Feet: ${property.square_feet}`);
      console.log(`   Amenities: ${property.amenities || 'None listed'}`);
      console.log(`   Free Rent Concessions: ${property.free_rent_concessions || 'None'}`);
      console.log(`   External ID: ${property.external_id}`);
      console.log(`   Source: ${property.source}`);
      console.log(`   Created: ${property.created_at}`);
    });
  } else {
    console.log('   No data found in scraped_properties table');
  }

  // Check properties table (frontend)
  console.log('\n🏠 FRONTEND PROPERTIES TABLE:');
  const { data: properties, error: propsError } = await supabase
    .from('properties')
    .select('*')
    .ilike('name', '%sentral%')
    .order('created_at', { ascending: false })
    .limit(5);

  if (propsError) {
    console.error('❌ Error fetching properties data:', propsError);
  } else if (properties && properties.length > 0) {
    properties.forEach((property, index) => {
      console.log(`\n🏢 Property ${index + 1}:`);
      console.log(`   Name: ${property.name}`);
      console.log(`   Address: ${property.address}`);
      console.log(`   City: ${property.city}, ${property.state}`);
      console.log(`   Original Price: $${property.original_price}`);
      console.log(`   AI Price: $${property.ai_price}`);
      console.log(`   Effective Price: $${property.effective_price}`);
      console.log(`   Bedrooms: ${property.bedrooms}, Bathrooms: ${property.bathrooms}`);
      console.log(`   Square Feet: ${property.sqft}`);
      console.log(`   Amenities: ${JSON.stringify(property.amenities, null, 2)}`);
      console.log(`   Features: ${JSON.stringify(property.features, null, 2)}`);
      console.log(`   External ID: ${property.external_id}`);
      console.log(`   Created: ${property.created_at}`);
    });
  } else {
    console.log('   No data found in properties table');
  }

  // Check apartment_iq_data if it exists
  console.log('\n🧠 APARTMENT IQ DATA:');
  const { data: iqData, error: iqError } = await supabase
    .from('apartment_iq_data')
    .select('*')
    .limit(5);

  if (iqError) {
    console.log('   Apartment IQ table may not exist or no data');
  } else if (iqData && iqData.length > 0) {
    console.log(`   Found ${iqData.length} IQ records`);
  } else {
    console.log('   No IQ data found');
  }
}

checkSentralData().catch(console.error);