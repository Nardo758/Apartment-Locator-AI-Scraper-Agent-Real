const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDatabase() {
  try {
    console.log('Testing database connection...');

    // Check current count
    const { data: beforeData, error: beforeError } = await supabase
      .from('scraped_properties')
      .select('count', { count: 'exact' });

    if (beforeError) {
      console.error('Error checking count:', beforeError);
      return;
    }

    console.log('Records before insert:', beforeData);

    // Insert test data
    const testData = {
      property_id: 'test_property_123',
      unit_number: 'unit_1',
      source: 'test',
      name: 'Test Apartment',
      address: '123 Test St',
      city: 'Atlanta',
      state: 'GA',
      current_price: 1250,
      bedrooms: 2,
      bathrooms: 2.0,
      square_feet: 1200,
      listing_url: 'https://example.com/test'
    };

    const { data: insertData, error: insertError } = await supabase
      .from('scraped_properties')
      .upsert(testData, { onConflict: 'external_id' });

    if (insertError) {
      console.error('Error inserting data:', insertError);
      return;
    }

    console.log('✅ Data inserted successfully:', insertData);

    // Test RPC call
    try {
      const today = new Date().toISOString().slice(0, 10);
      const { data: rpcData, error: rpcError } = await supabase.rpc('rpc_inc_scraping_costs', {
        p_date: today,
        p_properties_scraped: 1,
        p_ai_requests: 1,
        p_tokens_used: 100,
        p_estimated_cost: 0.001,
        p_details: { test: true }
      });

      if (rpcError) {
        console.error('RPC Error:', rpcError);
      } else {
        console.log('✅ RPC call successful:', rpcData);
      }
    } catch (rpcError) {
      console.error('RPC call failed:', rpcError);
    }

    // Check count after
    const { data: afterData, error: afterError } = await supabase
      .from('scraped_properties')
      .select('count', { count: 'exact' });

    if (afterError) {
      console.error('Error checking count after:', afterError);
      return;
    }

    console.log('Records after insert:', afterData);
    console.log('✅ Database test completed successfully!');

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testDatabase();