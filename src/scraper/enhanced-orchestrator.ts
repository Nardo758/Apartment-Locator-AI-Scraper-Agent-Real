// Enhanced Scraper Orchestrator with Frontend Integration
// src/scraper/enhanced-orchestrator.ts

import type { SupabaseClient } from '@supabase/supabase-js';
import { getModelCost } from './costs';
import { scraperFrontendIntegration } from './frontend-integration';

export type ScrapingJob = Record<string, unknown> & {
  external_id: string;
  queue_id?: number;
  current_price?: number;
  last_scraped?: string | null;
  change_frequency?: number | null;
  stability_level?: string | null;
  status?: string | null;
  priority_score?: number | null;
  property_source_id?: number;
};

export type ScrapingResult = {
  success: boolean;
  properties: any[];
  cost: number;
  source: string;
  metadata: Record<string, any>;
  processing_time: number;
  frontend_integration?: {
    processed: number;
    errors: string[];
    frontend_properties_created: number;
  };
};

/**
 * Enhanced orchestrator that integrates with frontend data requirements
 */
export class EnhancedScrapingOrchestrator {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Get properties to scrape using the new property_sources system
   */
  async getPropertySourcesBatch(limit = 50, region?: string): Promise<ScrapingJob[]> {
    const { data: sources, error } = await this.supabase
      .rpc('get_next_property_sources_batch', {
        batch_size: limit,
        region_filter: region
      });

    if (error) {
      console.error('Error getting property sources batch:', error);
      return [];
    }

    // Transform property sources to scraping jobs
    const jobs: ScrapingJob[] = (sources || []).map(source => ({
      external_id: `source_${source.id}_${Date.now()}`,
      property_source_id: source.id,
      url: source.url,
      property_name: source.property_name,
      website_name: source.website_name,
      priority_score: source.priority * 10, // Convert 1-10 to 10-100
      expected_units: source.expected_units,
      metadata: source.metadata,
      should_scrape: true,
      ai_model: 'gpt-4-turbo-preview', // Use best model for property sources
      processing_level: 'comprehensive'
    }));

    return jobs;
  }

  /**
   * Enhanced cost-optimized batch with frontend integration
   */
  async getCostOptimizedBatchWithFrontend(weeklyTargetUSD = 300, region?: string): Promise<ScrapingJob[]> {
    // First, get property sources (higher priority)
    const propertySourceJobs = await this.getPropertySourcesBatch(20, region);
    
    // Then get individual properties for updates
    const individualJobs = await this.getCostOptimizedBatch(weeklyTargetUSD * 0.7); // 70% for individual updates
    
    // Combine and prioritize
    const allJobs = [...propertySourceJobs, ...individualJobs];
    
    // Sort by priority and limit by cost
    return this.optimizeBatchByCost(allJobs, weeklyTargetUSD);
  }

  /**
   * Original cost-optimized batch method (preserved for compatibility)
   */
  async getCostOptimizedBatch(weeklyTargetUSD = 300): Promise<ScrapingJob[]> {
    const highQuery = this.supabase
      .from('scraped_properties')
      .select('*')
      .gte('priority_score', 70)
      .order('priority_score', { ascending: false })
      .limit(50000);
      
    const medQuery = this.supabase
      .from('scraped_properties')
      .select('*')
      .gte('priority_score', 40)
      .lt('priority_score', 70)
      .order('priority_score', { ascending: false })
      .limit(50000);
      
    const lowQuery = this.supabase
      .from('scraped_properties')
      .select('*')
      .lt('priority_score', 40)
      .order('priority_score', { ascending: false })
      .limit(50000);

    const [highRes, medRes, lowRes] = await Promise.all([highQuery, medQuery, lowQuery]);
    const highRows = (highRes.data || []) as ScrapingJob[];
    const medRows = (medRes.data || []) as ScrapingJob[];
    const lowRows = (lowRes.data || []) as ScrapingJob[];

    let remaining = Number(weeklyTargetUSD);
    const selected: ScrapingJob[] = [];

    const pickFrom = (rows: ScrapingJob[], maxCount = 100000) => {
      for (const r of rows) {
        if (selected.length >= maxCount) break;
        const cost = this.estimateCostForJob(r);
        if (cost <= remaining) {
          selected.push(r);
          remaining -= cost;
        }
        if (remaining <= 0) break;
      }
    };

    pickFrom(highRows);
    pickFrom(medRows);
    pickFrom(lowRows);

    // Enrich with scraping decisions
    const enriched = await Promise.all(selected.map(async (property) => ({
      ...property,
      should_scrape: await this.shouldScrapeProperty(property),
      ai_model: (property.change_frequency ?? 0) > 30 ? 'gpt-3.5-turbo' : 'gpt-4-turbo-preview',
      processing_level: property.stability_level ?? 'default'
    })));

    return enriched;
  }

  /**
   * Process scraping results with frontend integration
   */
  async processScrapingResults(results: any[], source: string, cost: number): Promise<ScrapingResult> {
    const startTime = Date.now();
    
    const scrapingResult: ScrapingResult = {
      success: results.length > 0,
      properties: results,
      cost,
      source,
      metadata: {
        processed_at: new Date().toISOString(),
        total_properties: results.length,
        source_breakdown: this.analyzeSourceBreakdown(results)
      },
      processing_time: 0 // Will be set below
    };

    // Integrate with frontend data system
    try {
      console.log('🔄 Integrating scraping results with frontend system...');
      
      const frontendIntegration = await scraperFrontendIntegration.processScraperResults(scrapingResult);
      scrapingResult.frontend_integration = frontendIntegration;
      
      // Update property source metrics
      await this.updatePropertySourceMetrics(results);
      
      console.log(`✅ Frontend integration complete: ${frontendIntegration.frontend_properties_created} properties processed`);
      
    } catch (error) {
      console.error('❌ Frontend integration error:', error);
      scrapingResult.frontend_integration = {
        processed: 0,
        errors: [error.message],
        frontend_properties_created: 0
      };
    }

    scrapingResult.processing_time = Date.now() - startTime;
    return scrapingResult;
  }

  /**
   * Update property source metrics based on scraping results
   */
  private async updatePropertySourceMetrics(results: any[]): Promise<void> {
    // Group results by property source
    const sourceResults = new Map<number, any[]>();
    
    for (const result of results) {
      const sourceId = result.property_source_id;
      if (sourceId) {
        if (!sourceResults.has(sourceId)) {
          sourceResults.set(sourceId, []);
        }
        sourceResults.get(sourceId)!.push(result);
      }
    }

    // Update metrics for each source
    for (const [sourceId, sourceResults] of sourceResults) {
      try {
        const unitsFound = sourceResults.length;
        const avgCost = 0.05; // Estimate cost per property
        const totalCost = avgCost * unitsFound;
        const success = unitsFound > 0;

        await this.supabase.rpc('update_property_source_metrics', {
          source_id: sourceId,
          units_found: unitsFound,
          scrape_cost: totalCost,
          success: success,
          error_message: success ? null : 'No properties found'
        });

      } catch (error) {
        console.error(`Error updating metrics for source ${sourceId}:`, error);
      }
    }
  }

  /**
   * Analyze source breakdown for metadata
   */
  private analyzeSourceBreakdown(results: any[]): Record<string, number> {
    const breakdown: Record<string, number> = {};
    
    for (const result of results) {
      const source = result.source || result.website_name || 'unknown';
      breakdown[source] = (breakdown[source] || 0) + 1;
    }
    
    return breakdown;
  }

  /**
   * Optimize batch by cost constraints
   */
  private optimizeBatchByCost(jobs: ScrapingJob[], maxCost: number): ScrapingJob[] {
    // Sort by priority score descending
    jobs.sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0));
    
    let totalCost = 0;
    const selected: ScrapingJob[] = [];
    
    for (const job of jobs) {
      const jobCost = this.estimateCostForJob(job);
      if (totalCost + jobCost <= maxCost) {
        selected.push(job);
        totalCost += jobCost;
      }
    }
    
    return selected;
  }

  /**
   * Estimate cost for a scraping job
   */
  private estimateCostForJob(job: ScrapingJob): number {
    const model = String(job.ai_model ?? 'gpt-4-turbo-preview');
    const processingLevel = String(job.processing_level ?? 'default');
    
    // Estimate tokens based on processing level
    let tokens = 3000; // default
    if (processingLevel === 'minimal') tokens = 1000;
    if (processingLevel === 'comprehensive') tokens = 5000;
    
    return getModelCost(model) * tokens / 1000;
  }

  /**
   * Enhanced property scraping decision with frontend considerations
   */
  async shouldScrapeProperty(property: ScrapingJob): Promise<boolean> {
    // Original logic
    const daysSinceLastScrape = this.getDaysSince(property.last_scraped);
    const stabilityScore = this.calculateStabilityScore(property);
    const recommended = this.getRecommendedFrequency(stabilityScore);

    // Frontend-specific considerations
    try {
      // Check if this property is in high demand (has recent user searches/matches)
      const { data: recentActivity } = await this.supabase
        .from('properties')
        .select('match_score, updated_at')
        .eq('external_id', property.external_id)
        .single();

      if (recentActivity) {
        // If property has high match scores or recent updates, prioritize it
        if (recentActivity.match_score && recentActivity.match_score > 80) {
          return daysSinceLastScrape >= Math.max(1, recommended / 2); // More frequent for high-match properties
        }
      }
    } catch (error) {
      // Continue with original logic if frontend check fails
    }

    // Original tier-based sampling logic
    const tierNum = this.calculateTier(property);
    if (tierNum >= 3) {
      const externalId = String(property.external_id ?? '');
      const weekNumber = this.isoWeekNumber(new Date());
      const seed = Number(Deno.env.get('SAMPLING_SEED') ?? 0);
      if (!this.deterministicSample(externalId, weekNumber, 0.10, seed)) return false;
    }

    if (daysSinceLastScrape < recommended) return false;
    if (property.status === 'leased' && daysSinceLastScrape < 30) return false;

    return true;
  }

  /**
   * Calculate tier for property
   */
  private calculateTier(property: ScrapingJob): number {
    const rawTier = property['tier'];
    if (rawTier !== undefined && rawTier !== null) {
      const tierNum = Number(rawTier);
      if (!Number.isNaN(tierNum)) return tierNum;
    }
    
    const ps = Number(property.priority_score ?? 0);
    if (ps >= 70) return 1;
    if (ps >= 40) return 2;
    if (ps >= 20) return 3;
    return 4;
  }

  /**
   * Utility methods (preserved from original)
   */
  private getDaysSince(dateStr?: string | null): number {
    if (!dateStr) return Number.POSITIVE_INFINITY;
    const then = new Date(dateStr).getTime();
    if (Number.isNaN(then)) return Number.POSITIVE_INFINITY;
    const diffMs = Date.now() - then;
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  private calculateStabilityScore(property: ScrapingJob): number {
    const priceChanges = Number(property.price_changes ?? 0);
    const daysOnMarket = Number(property.days_on_market ?? 9999);
    let score = 100 - Math.min(priceChanges * 10, 50) - Math.min(daysOnMarket / 3, 50);
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private getRecommendedFrequency(stabilityScore: number): number {
    if (stabilityScore <= 20) return 1; // daily
    if (stabilityScore <= 50) return 7; // weekly
    if (stabilityScore <= 80) return 14; // bi-weekly
    return 30; // monthly
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  private deterministicSample(external_id: string, weekNumber: number, sampleRate: number, sampling_seed = 0): boolean {
    const key = `${external_id}_${weekNumber}_${sampling_seed}`;
    const hash = this.simpleHash(key);
    return (hash % 100) < Math.round(sampleRate * 100);
  }

  private isoWeekNumber(d: Date): number {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    return weekNo;
  }

  /**
   * Get frontend-ready properties for API responses
   */
  async getFrontendProperties(filters: any = {}): Promise<any[]> {
    return scraperFrontendIntegration.getFrontendProperties(filters);
  }
}

// Export singleton instance
export const enhancedScrapingOrchestrator = new EnhancedScrapingOrchestrator(
  // Supabase client would be injected here
  {} as SupabaseClient
);