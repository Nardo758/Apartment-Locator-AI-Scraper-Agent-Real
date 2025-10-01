const { createClient } = require('@supabase/supabase-js');

// Production keys
const SUPABASE_URL = 'https://jdymvpasjsdbryatscux.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkeW12cGFzanNkYnJ5YXRzY3V4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1ODc1NTgsImV4cCI6MjA3NDE2MzU1OH0.Y88-nn2LDE6qZ4p69rFuOCjM6ES027WXs-T_4g7DTso';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testFunction() {
  try {
    console.log('🧪 Testing ai-scraper-worker function with direct fetch...');

    const testData = {
      cleanHtml: '<div><h1>Test Apartment Complex</h1><p>Beautiful 2 bedroom apartment for $1,500/month</p><p>Located at 123 Main Street, Atlanta, GA</p><p>Features: 2 beds, 1 bath, 900 sqft</p><p>Amenities: Pool, Gym, Parking</p><p>Special: 1 month free rent!</p></div>',
      url: 'https://example.com/test-listing',
      test_mode: true
    };

    console.log('📤 Sending request with fetch...');

    const response = await fetch('https://jdymvpasjsdbryatscux.supabase.co/functions/v1/ai-scraper-worker', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });

    console.log('📊 Status:', response.status, response.statusText);

    const responseText = await response.text();
    console.log('📄 Response body:', responseText);

    if (response.ok) {
      console.log('✅ Success!');
    } else {
      console.log('❌ Error response');
    }

  } catch (err) {
    console.error('💥 Test failed:', err.message);
  }
}

testFunction();