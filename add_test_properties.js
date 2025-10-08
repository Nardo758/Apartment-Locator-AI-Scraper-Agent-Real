import process from "node:process";
const { createClient } = require('@supabase/supabase-js');

// Read Supabase runtime values from environment and fail fast if missing
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_ANON || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Error: SUPABASE_URL and SUPABASE_ANON_KEY must be set in the environment to run this script.');
  process.exit(1);
}

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