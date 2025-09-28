// test-scraper-function.ts
import { handler } from './index.ts';

async function testScraper() {
    console.log(' Testing AI Scraper Edge Function');
    
    // Create a mock request similar to what Supabase would send
    const testRequest = new Request('http://localhost:54321/functions/v1/ai-scraper-worker', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify({
            url: 'https://example-apartment-site.com/listings/123',
            test_mode: true
        })
    });

    try {
        console.log(' Sending test request...');
        const response = await handler(testRequest);
        const result = await response.json();
        
        console.log(' Function executed successfully');
        console.log('Status:', response.status);
        console.log('Response:', JSON.stringify(result, null, 2));
        
    } catch (error) {
        console.log(' Function error:', error.message);
        console.log(' This might be expected if the function needs specific environment variables');
    }
}

// Run the test if this file is executed directly
if (import.meta.main) {
    testScraper();
}
