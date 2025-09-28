// Enhanced Scheduled Scraper with URL Management and Cost Monitoring
// supabase/functions/scheduled-scraper/index.ts

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

interface DeploymentConfig {
  scraping_enabled: boolean;
  claude_analysis_enabled: boolean;
  batch_size: number;
  cost_limit_daily: number;
  max_consecutive_failures: number;
  rate_limit_delay_ms: number;
  regions: string[];
  auto_pause_on_errors: boolean;
  quality_threshold: number;
}

interface PropertySource {
  id: number;
  url: string;
  property_name: string;
  website_name: string;
  priority: number;
  expected_units: number;
  region: string;
  metadata: Record<string, any>;
  success_rate: number;
  consecutive_failures: number;
}

interface ScrapingResult {
  source_id: number;
  properties_found: number;
  cost: number;
  success: boolean;
  error?: string;
  intelligence_added: boolean;
}

serve(async (req: Request) => {
  try {
    console.log('🚀 Scheduled scraper started');
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request body
    const requestBody = await req.json().catch(() => ({}));
    const {
      region,
      batch_size: requestBatchSize,
      claude_enabled,
      source,
      force = false
    } = requestBody;

    // Get deployment configuration
    const config = await getDeploymentConfig();
    
    console.log('📋 Configuration loaded:', {
      scraping_enabled: config.scraping_enabled,
      claude_enabled: config.claude_analysis_enabled,
      batch_size: config.batch_size,
      regions: config.regions,
      cost_limit: config.cost_limit_daily
    });

    // Check if scraping is enabled
    if (!config.scraping_enabled && !force) {
      return new Response(JSON.stringify({
        status: 'paused',
        message: 'Scraping is disabled in configuration',
        timestamp: new Date().toISOString()
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      });
    }

    // Health check - cost monitoring
    const dailyCost = await getDailyCost(supabase);
    console.log(`💰 Current daily cost: $${dailyCost}`);
    
    if (dailyCost > config.cost_limit_daily && !force) {
      console.log(`⚠️ Daily cost limit exceeded: $${dailyCost} > $${config.cost_limit_daily}`);
      
      // Auto-disable scraping if configured
      if (config.auto_pause_on_errors) {
        await disableScraping(supabase);
      }
      
      return new Response(JSON.stringify({
        status: 'paused',
        reason: 'Daily cost limit exceeded',
        cost: dailyCost,
        limit: config.cost_limit_daily,
        timestamp: new Date().toISOString()
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      });
    }

    // Get next batch of URLs to scrape
    const batchSize = requestBatchSize || config.batch_size;
    const propertiesToScrape = await getNextScrapingBatch(supabase, batchSize, region);
    
    console.log(`📊 Found ${propertiesToScrape.length} property sources to scrape`);
    
    if (propertiesToScrape.length === 0) {
      return new Response(JSON.stringify({
        status: 'complete',
        message: 'No property sources ready for scraping',
        next_check: calculateNextRun(),
        timestamp: new Date().toISOString()
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      });
    }

    // Process batch with enhanced error handling
    const results: ScrapingResult[] = [];
    let totalCost = 0;
    let totalProperties = 0;
    
    for (const propertySource of propertiesToScrape) {
      try {
        console.log(`🔍 Processing: ${propertySource.property_name} (${propertySource.url})`);
        
        // Rate limiting
        if (results.length > 0) {
          await sleep(config.rate_limit_delay_ms);
        }
        
        // Process property source
        const result = await processPropertySource(
          supabase,
          propertySource,
          config.claude_analysis_enabled && (claude_enabled !== false)
        );
        
        results.push(result);
        totalCost += result.cost;
        totalProperties += result.properties_found;
        
        // Update source metrics
        await updatePropertySourceMetrics(
          supabase,
          propertySource.id,
          result.properties_found,
          result.cost,
          result.success,
          result.error
        );
        
        console.log(`✅ Processed ${propertySource.property_name}: ${result.properties_found} properties, $${result.cost}`);
        
        // Check if we're approaching cost limit
        const currentDailyCost = await getDailyCost(supabase);
        if (currentDailyCost + totalCost > config.cost_limit_daily * 0.9) {
          console.log('⚠️ Approaching daily cost limit, stopping batch processing');
          break;
        }
        
      } catch (error) {
        console.error(`❌ Error processing ${propertySource.property_name}:`, error);
        
        const errorResult: ScrapingResult = {
          source_id: propertySource.id,
          properties_found: 0,
          cost: 0,
          success: false,
          error: error.message,
          intelligence_added: false
        };
        
        results.push(errorResult);
        
        // Update failure metrics
        await updatePropertySourceMetrics(
          supabase,
          propertySource.id,
          0,
          0,
          false,
          error.message
        );
      }
    }

    // Record batch operation cost
    if (totalCost > 0) {
      await recordScrapingCost(supabase, 'scheduled_batch', totalCost, {
        source: source || 'scheduled',
        properties_processed: totalProperties,
        sources_processed: results.length,
        region: region || 'all'
      });
    }

    // Generate summary
    const successfulScrapes = results.filter(r => r.success).length;
    const failedScrapes = results.filter(r => !r.success).length;
    const intelligenceAdded = results.filter(r => r.intelligence_added).length;
    
    console.log('📈 Batch Summary:', {
      total_sources: results.length,
      successful: successfulScrapes,
      failed: failedScrapes,
      properties_found: totalProperties,
      cost: totalCost,
      intelligence_added: intelligenceAdded
    });

    return new Response(JSON.stringify({
      status: 'success',
      summary: {
        sources_processed: results.length,
        successful_scrapes: successfulScrapes,
        failed_scrapes: failedScrapes,
        total_properties: totalProperties,
        intelligence_enhanced: intelligenceAdded,
        total_cost: totalCost,
        region: region || 'all'
      },
      results: results.map(r => ({
        source_id: r.source_id,
        success: r.success,
        properties: r.properties_found,
        cost: r.cost,
        error: r.error
      })),
      next_run: calculateNextRun(),
      timestamp: new Date().toISOString()
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('❌ Scheduled scraper error:', error);
    
    return new Response(JSON.stringify({
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString()
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500
    });
  }
});

async function getDeploymentConfig(): Promise<DeploymentConfig> {
  // In production, this could be from database, environment, or config service
  return {
    scraping_enabled: Deno.env.get('SCRAPING_ENABLED') !== 'false',
    claude_analysis_enabled: Deno.env.get('CLAUDE_ANALYSIS_ENABLED') !== 'false',
    batch_size: parseInt(Deno.env.get('BATCH_SIZE') || '10'),
    cost_limit_daily: parseFloat(Deno.env.get('DAILY_COST_LIMIT') || '50'),
    max_consecutive_failures: parseInt(Deno.env.get('MAX_CONSECUTIVE_FAILURES') || '5'),
    rate_limit_delay_ms: parseInt(Deno.env.get('RATE_LIMIT_DELAY_MS') || '1000'),
    regions: (Deno.env.get('SCRAPING_REGIONS') || 'atlanta,new-york,chicago').split(','),
    auto_pause_on_errors: Deno.env.get('AUTO_PAUSE_ON_ERRORS') !== 'false',
    quality_threshold: parseFloat(Deno.env.get('QUALITY_THRESHOLD') || '70')
  };
}

async function getDailyCost(supabase: any): Promise<number> {
  const today = new Date().toISOString().split('T')[0];
  
  const { data, error } = await supabase
    .from('scraping_costs')
    .select('cost')
    .gte('recorded_at', `${today}T00:00:00Z`)
    .lt('recorded_at', `${today}T23:59:59Z`);
  
  if (error) {
    console.error('Error getting daily cost:', error);
    return 0;
  }
  
  return data?.reduce((sum: number, record: any) => sum + (record.cost || 0), 0) || 0;
}

async function getNextScrapingBatch(
  supabase: any,
  batchSize: number,
  region?: string
): Promise<PropertySource[]> {
  const { data, error } = await supabase
    .rpc('get_next_property_sources_batch', {
      batch_size: batchSize,
      region_filter: region || null
    });
  
  if (error) {
    console.error('Error getting scraping batch:', error);
    return [];
  }
  
  return data || [];
}

async function processPropertySource(
  supabase: any,
  source: PropertySource,
  claudeEnabled: boolean
): Promise<ScrapingResult> {
  try {
    // Call the AI scraper worker for this property source
    const scraperResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/ai-scraper-worker`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        urls: [source.url],
        property_source_id: source.id,
        claude_analysis: claudeEnabled,
        metadata: {
          property_name: source.property_name,
          website_name: source.website_name,
          expected_units: source.expected_units
        }
      })
    });
    
    if (!scraperResponse.ok) {
      throw new Error(`Scraper worker failed: ${scraperResponse.status}`);
    }
    
    const scraperResult = await scraperResponse.json();
    
    // Enhanced Claude intelligence if enabled
    let intelligenceAdded = false;
    if (claudeEnabled && scraperResult.success && scraperResult.properties?.length > 0) {
      try {
        const intelligenceResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/property-researcher`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            property_source_id: source.id,
            url: source.url,
            property_name: source.property_name,
            mode: 'enhance_existing'
          })
        });
        
        if (intelligenceResponse.ok) {
          intelligenceAdded = true;
          console.log(`🧠 Claude intelligence added for ${source.property_name}`);
        }
      } catch (error) {
        console.warn(`⚠️ Claude intelligence failed for ${source.property_name}:`, error);
      }
    }
    
    return {
      source_id: source.id,
      properties_found: scraperResult.properties?.length || 0,
      cost: scraperResult.cost || 0,
      success: scraperResult.success || false,
      error: scraperResult.error,
      intelligence_added: intelligenceAdded
    };
    
  } catch (error) {
    return {
      source_id: source.id,
      properties_found: 0,
      cost: 0,
      success: false,
      error: error.message,
      intelligence_added: false
    };
  }
}

async function updatePropertySourceMetrics(
  supabase: any,
  sourceId: number,
  unitsFound: number,
  cost: number,
  success: boolean,
  errorMessage?: string
): Promise<void> {
  const { error } = await supabase
    .rpc('update_property_source_metrics', {
      source_id: sourceId,
      units_found: unitsFound,
      scrape_cost: cost,
      success: success,
      error_message: errorMessage || null
    });
  
  if (error) {
    console.error('Error updating source metrics:', error);
  }
}

async function recordScrapingCost(
  supabase: any,
  operationType: string,
  cost: number,
  metadata: Record<string, any>
): Promise<void> {
  const { error } = await supabase
    .rpc('rpc_inc_scraping_costs', {
      operation_type: operationType,
      cost_amount: cost,
      metadata: metadata
    });
  
  if (error) {
    console.error('Error recording scraping cost:', error);
  }
}

async function disableScraping(supabase: any): Promise<void> {
  // This would update a configuration table or send an alert
  console.log('🚫 Auto-disabling scraping due to cost limits');
  // Implementation depends on how configuration is stored
}

function calculateNextRun(): string {
  // Calculate next Sunday at midnight
  const now = new Date();
  const nextSunday = new Date(now);
  nextSunday.setDate(now.getDate() + (7 - now.getDay()));
  nextSunday.setHours(0, 0, 0, 0);
  return nextSunday.toISOString();
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}