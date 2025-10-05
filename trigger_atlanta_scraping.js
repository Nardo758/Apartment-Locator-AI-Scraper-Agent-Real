const { createClient } = require('@supabase/supabase-js');

// Read Supabase credentials from environment variables. Avoid committing keys to source.
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_ANON || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Error: SUPABASE_URL and SUPABASE_ANON_KEY must be set in the environment to run this script.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function triggerAtlantaScraping() {
  try {
    console.log('🔍 Connected to Supabase database');

    // Get pending Atlanta jobs (limit to 100 for this test)
    const { data: jobs, error: queueError } = await supabase
      .from('scraping_queue')
      .select('id, external_id, property_id, unit_number, url, source, priority')
      .eq('status', 'pending')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(100);

    if (queueError) {
      throw new Error(`Failed to fetch jobs: ${queueError.message}`);
    }

    console.log(`📋 Found ${jobs.length} pending jobs to process`);

    if (jobs.length === 0) {
      console.log('❌ No pending jobs found');
      return;
    }

    // Process jobs SEQUENTIALLY to avoid rate limits (not in batches)
    let processedCount = 0;
    let successCount = 0;
    let errorCount = 0;

    console.log('🚀 Starting Atlanta property scraping (sequential processing to avoid rate limits)...');

    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i];
      console.log(`\n📦 Processing job ${i + 1}/${jobs.length}: ${job.url}`);

      try {
        // Update job status to processing
        const { error: processingError } = await supabase
          .from('scraping_queue')
          .update({ status: 'processing', started_at: new Date().toISOString() })
          .eq('id', job.id);

        if (processingError) {
          throw new Error(`Failed to update job status to processing: ${processingError.message}`);
        }

        // Call the Edge Function to scrape this property
        const scrapeResult = await scrapeProperty(job);

        if (scrapeResult.success) {
          // Update job status to completed
          const { error: completedError } = await supabase
            .from('scraping_queue')
            .update({ status: 'completed', completed_at: new Date().toISOString() })
            .eq('id', job.id);

          if (completedError) {
            console.error(`Failed to update job status to completed: ${completedError.message}`);
          }
          console.log(`  ✅ Completed: ${job.property_id}`);
          successCount++;
        } else {
          // Update job status to failed
          const { error: failedError } = await supabase
            .from('scraping_queue')
            .update({ status: 'failed', error: scrapeResult.error })
            .eq('id', job.id);

          if (failedError) {
            console.error(`Failed to update job status to failed: ${failedError.message}`);
          }
          console.log(`  ❌ Failed: ${job.property_id} - ${scrapeResult.error}`);
          errorCount++;
        }

      } catch (error) {
        console.error(`  💥 Error processing ${job.property_id}:`, error.message);
        // Update job status to failed
        const { error: catchError } = await supabase
          .from('scraping_queue')
          .update({ status: 'failed', error: error.message })
          .eq('id', job.id);

        if (catchError) {
          console.error(`Failed to update job status in catch block: ${catchError.message}`);
        }
        errorCount++;
      }

      processedCount++;

      // Long delay between jobs to respect rate limits (45 seconds)
      if (i < jobs.length - 1) {
        console.log('⏳ Waiting 45 seconds before next job to respect Claude rate limits...');
        await new Promise(resolve => setTimeout(resolve, 45000));
      }
    }

    // Final statistics
    console.log('\n🎉 ATLANTA SCRAPING COMPLETE!');
    console.log(`📊 Total processed: ${processedCount}`);
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${errorCount}`);
    console.log(`📈 Success rate: ${((successCount / processedCount) * 100).toFixed(1)}%`);

    // Check final database state
    const jobIds = jobs.map(j => j.id);
    const { data: finalStats, error: statsError } = await supabase
      .from('scraping_queue')
      .select('status')
      .in('id', jobIds);

    if (!statsError && finalStats) {
      const statusCounts = finalStats.reduce((acc, row) => {
        acc[row.status] = (acc[row.status] || 0) + 1;
        return acc;
      }, {});

      console.log('\n📊 Final queue status:');
      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`  ${status}: ${count}`);
      });
    }

    // Check scraped properties count
    const { count: scrapedCount, error: countError } = await supabase
      .from('apartments')
      .select('*', { count: 'exact', head: true });

    if (!countError) {
      console.log(`🏠 Total properties in database: ${scrapedCount}`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

async function scrapeProperty(job) {
  try {
    console.log(`    🌐 Multi-page scraping for: ${job.url}`);

    // Extract base URL for constructing additional page URLs
    const urlObj = new URL(job.url);
    const baseUrl = urlObj.origin;
    const basePath = urlObj.pathname.replace(/\/$/, ''); // Remove trailing slash

    // Target pages to scrape for comprehensive data (prioritized)
    const targetPages = [
      job.url, // Homepage for basic info - always first
      `${baseUrl}/floorplans/`, // Most important for pricing/unit details
      `${baseUrl}/apartments/floor-plans`, // Alternative floor plans path
      `${baseUrl}/floor-plans`, // Another common path
      `${baseUrl}/amenities/`, // Community amenities
      `${baseUrl}/features/` // Alternative amenities path
    ];

    let combinedHtml = '';
    let pagesFetched = 0;
    const maxHtmlLength = 500000; // Limit to ~500KB to avoid rate limits

    // Fetch pages in priority order, stopping if we hit size limit
    for (const pageUrl of targetPages) {
      if (combinedHtml.length > maxHtmlLength) {
        console.log(`        📏 Stopping at ${combinedHtml.length} chars to avoid rate limits`);
        break;
      }

      try {
        console.log(`      📄 Fetching: ${pageUrl}`);

        const response = await fetch(pageUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
          },
          timeout: 10000 // 10 second timeout per page
        });

        if (response.ok) {
          const pageHtml = await response.text();

          // Truncate very large pages to essential content
          let truncatedHtml = pageHtml;
          if (pageHtml.length > 100000) {
            // Keep the first 50KB and last 50KB of large pages (often headers/footers have key info)
            const firstPart = pageHtml.substring(0, 50000);
            const lastPart = pageHtml.substring(pageHtml.length - 50000);
            truncatedHtml = firstPart + '\n<!-- CONTENT TRUNCATED -->\n' + lastPart;
            console.log(`        ✂️  Truncated page from ${pageHtml.length} to ${truncatedHtml.length} chars`);
          }

          combinedHtml += `\n<!-- PAGE: ${pageUrl} -->\n${truncatedHtml}\n<!-- END PAGE: ${pageUrl} -->\n`;
          pagesFetched++;
          console.log(`        ✅ Added ${truncatedHtml.length} chars from ${pageUrl.split('/').pop() || 'homepage'}`);
        } else {
          console.log(`        ⚠️  Page not found (${response.status}): ${pageUrl}`);
        }
      } catch (fetchError) {
        console.log(`        ⚠️  Fetch failed for ${pageUrl}: ${fetchError.message}`);
      }

      // Small delay between page requests to be respectful
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    if (pagesFetched === 0) {
      throw new Error('Failed to fetch any pages from the property website');
    }

    console.log(`    📋 Combined ${pagesFetched} pages into ${combinedHtml.length} characters of HTML`);

    // Call the production Edge Function with the combined HTML
    console.log(`    🤖 Calling production scraper with multi-page HTML`);
    const response = await fetch('https://jdymvpasjsdbryatscux.supabase.co/functions/v1/ai-scraper-worker', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        cleanHtml: combinedHtml,
        url: job.url,
        source: job.source,
        external_id: job.external_id,
        test_mode: true,
        multi_page: true,
        pages_fetched: pagesFetched
      })
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorBody = await response.text();
        console.log(`    ❌ Error response body: ${errorBody}`);
        errorMessage += ` - ${errorBody}`;
      } catch (e) {
        console.log(`    ❌ Could not read error response body`);
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();
    console.log(`    📄 Received response from scraper`);

    // The Edge Function should handle storing the data in the database
    // We just need to return success/failure
    return { success: true };

  } catch (error) {
    console.error(`    ❌ Scraper error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

triggerAtlantaScraping();