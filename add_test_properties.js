const { createClient } = require('@supabase/supabase-js');

// Production Supabase credentials
const SUPABASE_URL = 'https://jdymvpasjsdbryatscux.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkeW12cGFzanNkYnJ5YXRzY3V4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1ODc1NTgsImV4cCI6MjA3NDE2MzU1OH0.Y88-nn2LDE6qZ4p69rFuOCjM6ES027WXs-T_4g7DTso';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function addTestProperties() {
  const timestamp = Date.now();
  const properties = [
    {
      url: 'https://highlandsatsweetwatercreek.com',
      name: 'Highlands at Sweetwater Creek',
      property_id: `test_highlands_${timestamp}`,
      external_id: `test_highlands_${timestamp}_1`
    },
    {
      url: 'https://www.novelwestmidtown.com',
      name: 'Novel West Midtown',
      property_id: `test_novel_${timestamp}`,
      external_id: `test_novel_${timestamp}_1`
    },
    {
      url: 'https://broadstone2thirty.com',
      name: 'Broadstone 230',
      property_id: `test_broadstone_${timestamp}`,
      external_id: `test_broadstone_${timestamp}_1`
    },
    {
      url: 'https://www.sentral.com/atlanta/west-midtown',
      name: 'Sentral West Midtown',
      property_id: `test_sentral_${timestamp}`,
      external_id: `test_sentral_${timestamp}_1`
    },
    {
      url: 'https://boulevardatgrantpark.com',
      name: 'Boulevard at Grant Park',
      property_id: `test_boulevard_${timestamp}`,
      external_id: `test_boulevard_${timestamp}_1`
    }
  ];

  console.log('Adding 5 test properties to scraping queue...');

  for (const property of properties) {
    try {
      const { data, error } = await supabase
        .from('scraping_queue')
        .insert({
          external_id: property.external_id,
          property_id: property.property_id,
          unit_number: '1',
          url: property.url,
          source: 'test_manual',
          status: 'pending',
          priority: 10, // High priority for testing
          created_at: new Date().toISOString()
        })
        .select();

      if (error) {
        console.error(`❌ Failed to add ${property.name}:`, error.message);
      } else {
        console.log(`✅ Added: ${property.name} - ${property.url} (ID: ${data[0].id})`);
      }
    } catch (err) {
      console.error(`💥 Error adding ${property.name}:`, err.message);
    }
  }

  console.log('Finished adding test properties.');
}

addTestProperties();