const fetch = require('node-fetch');

async function testFunction() {
  const payload = {
    source: 'test',
    cleanHtml: '<html><body><h1>Test Apartment</h1><p>Address: 123 Test St, Atlanta, GA</p><p>Price: $1000/month</p></body></html>',
    url: 'https://test.com',
    test_mode: true
  };

  try {
    console.log('Testing production endpoint...');
    // Use production endpoint for testing
    const response = await fetch('https://jdymvpasjsdbryatscux.supabase.co/functions/v1/ai-scraper-worker', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkeW12cGFzanNkYnJ5YXRzY3V4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1ODc1NTgsImV4cCI6MjA3NDE2MzU1OH0.Y88-nn2LDE6qZ4p69rFuOCjM6ES027WXs-T_4g7DTso',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.text();
    console.log('Response status:', response.status);
    console.log('Response body:', result);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testFunction();