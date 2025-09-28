import type { SupabaseClient } from '@supabase/supabase-js';
import { getModelCost } from './costs.ts';
import { 
  transformScrapedToFrontendFormat, 
  batchTransformProperties,
  saveTransformedProperties,
  type ScrapedPropertyData,
  type FrontendProperty 
} from './data-transformer';

export type ScrapingJob = Record<string, unknown> & {
  external_id: string;
  queue_id?: number;
  current_price?: number;
  last_scraped?: string | null;
  change_frequency?: number | null;
  stability_level?: string | null;
  status?: string | null;
  priority_score?: number | null;
};

export async function getScrapingBatch(supabase: SupabaseClient, limit = 100): Promise<ScrapingJob[]> {
  const { data: properties, error } = await supabase
    .from('scraped_properties')
    .select(`*, price_history(count), scraping_logs(status, created_at)`)
    .order('priority_score', { ascending: false })
    .limit(limit);

  if (error) throw error;

  const rows: ScrapingJob[] = (properties || []) as ScrapingJob[];

  // Map and enrich
  const mapped = await Promise.all(rows.map(async (property) => ({
    ...property,
    should_scrape: await shouldScrapeProperty(property),
    ai_model: (property.change_frequency ?? 0) > 30 ? 'gpt-3.5-turbo' : 'gpt-4-turbo-preview',
    processing_level: property.stability_level ?? 'default'
  })));

  return mapped;
}

// Cost-optimized weekly batch selector
// Attempts to build a batch of properties for the week that fits an approximate cost target
export async function getCostOptimizedBatch(supabase: SupabaseClient, weeklyTargetUSD = 300): Promise<ScrapingJob[]> {
  // We'll pick high/medium/low priority buckets by querying top-N in each priority score range
  const highQuery = supabase.from('scraped_properties').select('*').gte('priority_score', 70).order('priority_score', { ascending: false }).limit(50000);
  const medQuery = supabase.from('scraped_properties').select('*').gte('priority_score', 40).lt('priority_score', 70).order('priority_score', { ascending: false }).limit(50000);
  const lowQuery = supabase.from('scraped_properties').select('*').lt('priority_score', 40).order('priority_score', { ascending: false }).limit(50000);

  const [highRes, medRes, lowRes] = await Promise.all([highQuery, medQuery, lowQuery]);
  const highRows = (highRes.data || []) as ScrapingJob[];
  const medRows = (medRes.data || []) as ScrapingJob[];
  const lowRows = (lowRes.data || []) as ScrapingJob[];

  // Estimate per-model costs using the local helper

  // Heuristic: assume tokens per scrape by stability level (minimal -> 1k, default -> 3k)
  function estCostForJob(job: ScrapingJob) {
    const model = String(job.ai_model ?? ((job.change_frequency ?? 0) > 30 ? 'gpt-3.5-turbo' : 'gpt-4-turbo-preview'));
    const pl = String(job.stability_level ?? job.processing_level ?? 'default');
    const tokens = pl === 'minimal' ? 1000 : 3000;
    return getModelCost(model) * tokens / 1000;
  }

  // Start allocating budget across buckets
  let remaining = Number(weeklyTargetUSD);
  const selected: ScrapingJob[] = [];

  // helper to pick up to n from rows while budget allows
  function pickFrom(rows: ScrapingJob[], maxCount = 100000) {
    for (const r of rows) {
      if (selected.length >= maxCount) break;
      const c = estCostForJob(r);
      if (c <= remaining) {
        selected.push(r);
        remaining -= c;
      }
      if (remaining <= 0) break;
    }
  }

  // Prioritize high, then medium, then low
  pickFrom(highRows);
  pickFrom(medRows);
  pickFrom(lowRows);

  // Enrich selected rows similar to getScrapingBatch
  const mapped = await Promise.all(selected.map(async (property) => ({
    ...property,
    should_scrape: await shouldScrapeProperty(property),
    ai_model: (property.change_frequency ?? 0) > 30 ? 'gpt-3.5-turbo' : 'gpt-4-turbo-preview',
    processing_level: property.stability_level ?? 'default'
  })));

  return mapped;
}

// Enhanced batch processing with frontend data transformation
export async function getScrapingBatchWithTransformation(
  supabase: SupabaseClient, 
  limit = 100,
  enableFrontendSync = false
): Promise<{ jobs: ScrapingJob[], frontendProperties?: FrontendProperty[] }> {
  const jobs = await getScrapingBatch(supabase, limit);
  
  if (!enableFrontendSync) {
    return { jobs };
  }
  
  try {
    // Transform scraped properties to frontend format
    const scrapedProperties: ScrapedPropertyData[] = jobs.map(job => ({
      external_id: job.external_id,
      property_id: String(job.property_id || job.external_id.split('_')[0] || ''),
      unit_number: String(job.unit_number || job.external_id.split('_')[1] || '1'),
      source: String(job.source || 'unknown'),
      name: String(job.name || job.title || ''),
      address: String(job.address || ''),
      city: String(job.city || ''),
      state: String(job.state || ''),
      current_price: Number(job.current_price || 0),
      bedrooms: Number(job.bedrooms || 0),
      bathrooms: Number(job.bathrooms || 1),
      square_feet: job.square_feet ? Number(job.square_feet) : undefined,
      listing_url: String(job.listing_url || job.url || ''),
      status: String(job.status || 'active'),
      
      // Optional fields
      free_rent_concessions: job.free_rent_concessions ? String(job.free_rent_concessions) : undefined,
      application_fee: job.application_fee ? Number(job.application_fee) : undefined,
      admin_fee_waived: Boolean(job.admin_fee_waived),
      admin_fee_amount: job.admin_fee_amount ? Number(job.admin_fee_amount) : undefined,
      security_deposit: job.security_deposit ? Number(job.security_deposit) : undefined,
      amenities: Array.isArray(job.amenities) ? job.amenities.map(String) : undefined,
      features: Array.isArray(job.features) ? job.features.map(String) : undefined,
      pet_policy: job.pet_policy ? String(job.pet_policy) : undefined,
      parking: job.parking ? String(job.parking) : undefined,
      latitude: job.latitude ? Number(job.latitude) : undefined,
      longitude: job.longitude ? Number(job.longitude) : undefined,
      zip_code: job.zip_code ? String(job.zip_code) : undefined,
      market_rent: job.market_rent ? Number(job.market_rent) : undefined,
      rent_estimate_low: job.rent_estimate_low ? Number(job.rent_estimate_low) : undefined,
      rent_estimate_high: job.rent_estimate_high ? Number(job.rent_estimate_high) : undefined,
      days_on_market: job.days_on_market ? Number(job.days_on_market) : undefined,
      price_changes: job.price_changes ? Number(job.price_changes) : undefined,
      first_seen_at: job.first_seen_at ? String(job.first_seen_at) : undefined,
      last_seen_at: job.last_seen_at ? String(job.last_seen_at) : undefined,
      scraped_at: job.scraped_at ? String(job.scraped_at) : undefined,
      created_at: job.created_at ? String(job.created_at) : undefined,
      updated_at: job.updated_at ? String(job.updated_at) : undefined,
    }));
    
    const frontendProperties = await batchTransformProperties(scrapedProperties);
    
    return { jobs, frontendProperties };
  } catch (error) {
    console.error('Error transforming properties for frontend:', error);
    return { jobs };
  }
}

// Sync scraped properties to frontend schema
export async function syncToFrontendSchema(
  supabase: SupabaseClient,
  frontendProperties: FrontendProperty[],
  targetTable = 'properties'
): Promise<{ success: number; errors: number; details: string[] }> {
  const details: string[] = [];
  
  try {
    const result = await saveTransformedProperties(supabase, frontendProperties, targetTable);
    
    details.push(`Successfully synced ${result.success} properties to ${targetTable}`);
    if (result.errors > 0) {
      details.push(`Failed to sync ${result.errors} properties`);
    }
    
    return {
      success: result.success,
      errors: result.errors,
      details
    };
  } catch (error) {
    details.push(`Error syncing to frontend schema: ${error.message}`);
    return {
      success: 0,
      errors: frontendProperties.length,
      details
    };
  }
}

export async function shouldScrapeProperty(property: ScrapingJob): Promise<boolean> {
  // small awaited no-op to avoid 'async function has no await' lint errors
  await Promise.resolve();

  const daysSinceLastScrape = getDaysSince(property.last_scraped);
  const stabilityScore = calculateStabilityScore(property);

  const recommended = getRecommendedFrequency(stabilityScore);
  // Smart sampling: for low-tier properties (tier >= 3) only sample ~10% weekly
  // If a property doesn't provide an explicit `tier`, derive a coarse tier from priority_score
  try {
    const rawTier = property['tier'];
    let tierNum: number | null = null;
    if (rawTier !== undefined && rawTier !== null) {
      tierNum = Number(rawTier as unknown);
      if (Number.isNaN(tierNum)) tierNum = null;
    }
    if (tierNum === null) {
      const ps = Number(property.priority_score ?? 0);
      if (ps >= 70) tierNum = 1;
      else if (ps >= 40) tierNum = 2;
      else if (ps >= 20) tierNum = 3;
      else tierNum = 4;
    }

    if (tierNum >= 3) {
      // Deterministic sampling: sample ~10% weekly using external_id + weekNumber + optional seed
      const externalId = String(property.external_id ?? '');
  const now = new Date();
  const weekNumber = isoWeekNumber(now);
      const seed = Number(Deno.env.get('SAMPLING_SEED') ?? 0);
      if (!deterministicSample(externalId, weekNumber, 0.10, seed)) return false;
    }
  } catch {
    // If anything goes wrong with sampling, fall back to normal behavior
  }
  if (daysSinceLastScrape < recommended) return false;

  if (property.status === 'leased' && daysSinceLastScrape < 30) return false;

  return true;
}

// Deterministic sampler helpers
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

function deterministicSample(external_id: string, weekNumber: number, sampleRate: number, sampling_seed = 0): boolean {
  const key = `${external_id}_${weekNumber}_${sampling_seed}`;
  const hash = simpleHash(key);
  return (hash % 100) < Math.round(sampleRate * 100);
}

// ISO week number (ISO-8601)
function isoWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  // Set to nearest Thursday: current date + 4 - current day number
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return weekNo;
}

// Helpers
export function getDaysSince(dateStr?: string | null): number {
  if (!dateStr) return Number.POSITIVE_INFINITY;
  const then = new Date(dateStr).getTime();
  if (Number.isNaN(then)) return Number.POSITIVE_INFINITY;
  const diffMs = Date.now() - then;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export function calculateStabilityScore(property: ScrapingJob): number {
  // Simple heuristic: fewer price changes and longer days_on_market => more stable
  const priceChanges = Number(property.price_changes ?? 0);
  const daysOnMarket = Number(property.days_on_market ?? 9999);
  let score = 100 - Math.min(priceChanges * 10, 50) - Math.min(daysOnMarket / 3, 50);
  // clamp
  if (score < 0) score = 0;
  if (score > 100) score = 100;
  return Math.round(score);
}

export function getRecommendedFrequency(stabilityScore: number): number {
  // Return days between scrapes based on stability score (lower score -> more frequent)
  if (stabilityScore <= 20) return 1; // daily
  if (stabilityScore <= 50) return 7; // weekly
  if (stabilityScore <= 80) return 14; // bi-weekly
  return 30; // monthly
}
