import { SCRAPING_STRATEGY } from './priority.ts';
import type { ScrapingStrategy, ScrapingTier, CostPriority } from './priority.ts';
import { getScrapingBatch, shouldScrapeProperty, getDaysSince, calculateStabilityScore, getRecommendedFrequency } from './orchestrator.ts';
import { processScrapingResult } from './processResult.ts';
import type { SupabaseClient } from '@supabase/supabase-js';
import * as market from './market.ts';
import { extractAmenities } from './amenities.ts';
import { classifyPropertyType } from './propertyType.ts';
import { computeAiPricing } from '../lib/pricing-engine';
import { ClaudeService, type PropertyIntelligence } from '../services/claude-service.ts';

export { SCRAPING_STRATEGY };
export type { ScrapingStrategy, ScrapingTier, CostPriority };

export { getScrapingBatch, shouldScrapeProperty, getDaysSince, calculateStabilityScore, getRecommendedFrequency, processScrapingResult };

// Enhance property data with Claude AI intelligence
export async function enhanceWithClaudeIntelligence(url: string, htmlContent: string, propertyName: string): Promise<PropertyIntelligence | null> {
  try {
    console.log(`🧠 Getting Claude intelligence for: ${propertyName}`);
    
    const claudeService = new ClaudeService();
    const result = await claudeService.analyzeProperty(url, htmlContent, propertyName);

    if (result.success) {
      console.log('✅ Claude analysis successful:', result.data.confidence_score);
      return result.data;
    } else {
      console.warn('⚠️ Claude analysis failed, using fallback:', result.error);
      return result.data; // Still return fallback data
    }
  } catch (error) {
    console.error('❌ Claude intelligence error:', error);
    return null;
  }
}

// Enrich scraped property data with market intelligence. Accepts a Supabase client
// to fetch an existing property record by external_id so we can preserve first_seen_at.
export async function scrapePropertyWithMarketData(supabase: SupabaseClient, propertyData: Record<string, unknown>) {
    const concessions = market.extractConcessions((propertyData['description'] as string) ?? '');
    let firstSeen: string | null = null;
    const externalId = propertyData['external_id'] as string | undefined;
    if (externalId) {
        try {
            type FirstSeenRow = { first_seen_at?: string | null } | null;
            const { data } = await supabase.from('scraped_properties').select('first_seen_at').eq('external_id', externalId).maybeSingle() as { data: FirstSeenRow };
            if (data && data.first_seen_at) firstSeen = data.first_seen_at;
        } catch (_err) {
            // ignore lookup errors; we'll default to now
        }
    }

    const marketData: Record<string, unknown> = {
        concession_value: concessions.concessionValue,
        concession_type: concessions.concessionType,
        first_seen_at: firstSeen ?? new Date().toISOString(),
        // days_on_market is computed by scheduled job
    };

    return { ...propertyData, ...marketData };
}

// Final enhanced scraping function: runs enhanced scraping, market enrichment, amenities parsing and classification.
export async function scrapePropertyComplete(supabase: SupabaseClient, propertyData: Record<string, unknown>, htmlContent?: string) {
    // Phase 1: Basic enhancements
    const phase1Data = scrapePropertyEnhanced(propertyData);
    // Phase 2: Market intelligence (needs supabase to lookup first_seen)
    // preserve original external_id (if present) so lookup for first_seen_at succeeds
    const phase1Record = { ...(phase1Data as unknown as Record<string, unknown>) };
    if (propertyData && propertyData['external_id']) phase1Record['external_id'] = propertyData['external_id'];
    const phase2Data = await scrapePropertyWithMarketData(supabase, phase1Record);
    // Phase 3: Amenities and classification
    const amenities = extractAmenities((propertyData['description'] as string) ?? '');
    const propertyType = classifyPropertyType(propertyData['name'] as string | undefined, propertyData['description'] as string | undefined);

    // Phase 4: Claude AI intelligence (if HTML content is available)
    let claudeIntelligence = null;
    if (htmlContent && propertyData['url'] && propertyData['name']) {
        claudeIntelligence = await enhanceWithClaudeIntelligence(
            propertyData['url'] as string,
            htmlContent,
            propertyData['name'] as string
        );
    }

    const baseResult = {
        ...phase2Data,
        ...amenities,
        property_type: propertyType,
        // compute AI pricing heuristics (non-blocking deterministic calculation)
        ...(await computeAiPricing(supabase, { ...phase2Data as Record<string, unknown>, ...amenities } as Record<string, unknown>)),
    };

    // Add Claude intelligence fields if available
    if (claudeIntelligence) {
        return {
            ...baseResult,
            year_built: claudeIntelligence.year_built,
            unit_count: claudeIntelligence.unit_count,
            building_type: claudeIntelligence.building_type,
            neighborhood: claudeIntelligence.neighborhood,
            transit_access: claudeIntelligence.transit_access,
            walk_score: claudeIntelligence.walk_score,
            intelligence_confidence: claudeIntelligence.confidence_score,
            intelligence_source: claudeIntelligence.research_source,
            researched_at: claudeIntelligence.researched_at,
            // Merge Claude amenities with existing ones, avoiding duplicates
            amenities: [...new Set([...amenities.amenities || [], ...claudeIntelligence.amenities])],
            // Override property_type if Claude has higher confidence and different classification
            property_type: claudeIntelligence.confidence_score > 70 && claudeIntelligence.property_type !== 'unknown' 
                ? claudeIntelligence.property_type 
                : propertyType,
        };
    }

    return baseResult;
}

export class ApartmentScraper {
    constructor(private options: ScraperOptions) {}

    scrapeListings(): Promise<ApartmentListing[]> {
        // Implementation for scraping apartment listings
        return Promise.resolve([]);
    }

    parseListing(_rawData: unknown): ApartmentListing {
        // Implementation for parsing a single apartment listing
        return {
            id: '',
            title: '',
            price: 0,
            url: '',
            // other fields...
        };
    }
}

export interface ScraperOptions {
    source: string;
    maxListings: number;
}

export interface ApartmentListing {
    id: string;
    title: string;
    price: number;
    url: string;
    // other fields...
    zip_code?: string;
    latitude?: number;
    longitude?: number;
}

// Extract 5-digit or ZIP+4 zip code from an address string
export function extractZipCode(address?: string): string | null {
    if (!address || typeof address !== 'string') return null;
    const zipMatch = address.match(/\b\d{5}(?:-\d{4})?\b/);
    return zipMatch ? zipMatch[0] : null;
}

// Extract coordinates if included in the raw listing data. Falls back to null if not present.
export function extractCoordinates(listingData?: Record<string, unknown>): { lat: number; lng: number } | null {
    if (!listingData) return null;
    const coords = listingData['coordinates'];
    if (coords && typeof coords === 'object') {
        const c = coords as Record<string, unknown>;
        const latVal = c['lat'] ?? c['latitude'];
        const lngVal = c['lng'] ?? c['longitude'];
        const lat = Number(latVal as unknown);
        const lng = Number(lngVal as unknown);
        if (!Number.isNaN(lat) && !Number.isNaN(lng)) return { lat, lng };
    }
    return null;
}

// Enhanced per-property scraping: attach zip_code and coordinates (if available)
export function scrapePropertyEnhanced(this: unknown, propertyData?: Record<string, unknown>): ApartmentListing {
    // If the caller is an instance method, preserve that context; otherwise use default parse
    type ParserHost = { parseListing?: (d?: Record<string, unknown>) => ApartmentListing };
    const host = (this as unknown) as ParserHost;
    const parser = (host && typeof host.parseListing === 'function') ? host.parseListing.bind(host) : ((d?: Record<string, unknown>) => ({ id: (d && (d['id'] as string)) || '', title: (d && (d['title'] as string)) || '', price: (d && (Number(d['price'] as unknown) || 0)) || 0, url: (d && (d['url'] as string)) || '' }));
    const base = parser(propertyData) as ApartmentListing;

    const address = (propertyData && String(propertyData['address'] ?? '')) || '';
    const zip = extractZipCode(address);
    if (zip) base.zip_code = zip;

    const coords = extractCoordinates(propertyData);
    if (coords) {
        base.latitude = coords.lat;
        base.longitude = coords.lng;
    }

    return base;
}

