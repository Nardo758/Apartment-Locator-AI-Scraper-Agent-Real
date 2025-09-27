// Thin wrapper for Deno runtime to call the shared processor logic.
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient as _SupabaseClient } from '@supabase/supabase-js';
import { detectWebsiteType, processPropertyByType } from './index.ts';

interface ExtractedApartment {
  title?: string;
  unit_type?: string;
  address?: string;
  city?: string;
  state?: string;
  rent?: number;
  current_price?: number;
  bedrooms?: number;
  bathrooms?: number;
  [key: string]: unknown;
}

type ScrapingJob = {
  external_id: string;
  queue_id?: number;
  [k: string]: unknown;
};

type WorkerResult = {
  success: boolean;
  external_id?: string;
  ai_model_used?: string;
  price_changed?: boolean;
  duration?: number;
  error?: string;
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export async function runProcessor() {
  const { data: batch, error } = await supabase.rpc('get_next_scraping_batch', { batch_size: 50 });
  if (error) throw error;
  const raw = (batch || []) as Array<Record<string, unknown>>;
  const jobs = raw.filter((r): r is ScrapingJob => typeof r['external_id'] === 'string');

  const results: Array<Record<string, unknown>> = [];
  for (const job of jobs) {
    try {
      const startTime = Date.now();

      // Fetch HTML from the URL
      const htmlResponse = await fetch(job['url'] as string);
      if (!htmlResponse.ok) {
        throw new Error(`Failed to fetch HTML: ${htmlResponse.status}`);
      }
      const html = await htmlResponse.text();

      // Detect website type
      const websiteType = await detectWebsiteType(html, job['url'] as string);
      console.log(`Detected website type for ${job['url']}: ${websiteType}`);

      // Process based on website type
      const extractionResult = await processPropertyByType(job['url'] as string, html, websiteType);

      // Handle the result - it might be an array of apartments or an error
      let success = false;
      let apartments: ExtractedApartment[] = [];

      if (extractionResult && typeof extractionResult === 'object' && !extractionResult.error) {
        if (Array.isArray(extractionResult)) {
          // Multiple apartments returned
          apartments = extractionResult;
          success = apartments.length > 0;
        } else if (extractionResult.units && Array.isArray(extractionResult.units)) {
          // Structured response with units array
          apartments = extractionResult.units;
          success = apartments.length > 0;
        } else {
          // Single apartment or other format
          apartments = [extractionResult];
          success = true;
        }
      }

      // Save apartments to database if we have any
      if (success && apartments.length > 0) {
        for (const apartment of apartments) {
          try {
            // Generate external_id for each apartment
            const apartmentExternalId = `extracted_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            const apartmentData = {
              external_id: apartmentExternalId,
              source: job['source'],
              title: apartment.title || apartment.unit_type || `Apartment from ${job['source']}`,
              address: apartment.address || 'Address not found',
              city: apartment.city || 'City not found',
              state: apartment.state || 'State not found',
              rent_price: apartment.rent || apartment.current_price || 0,
              rent_amount: apartment.rent || apartment.current_price || 0,
              bedrooms: apartment.bedrooms || 0,
              bathrooms: apartment.bathrooms || 0,
              is_active: true,
              scraped_at: new Date().toISOString(),
              source_url: job['url'],
              source_name: job['source'],
              scraping_job_id: job['queue_id']
            };

            const { error: saveError } = await supabase
              .from('apartments')
              .upsert(apartmentData, { onConflict: 'external_id' });

            if (saveError) {
              console.error('Failed to save apartment:', saveError);
            } else {
              console.log('Saved apartment:', apartmentData.title);
            }
          } catch (saveError) {
            console.error('Error saving apartment:', saveError);
          }
        }
      }

      const duration = Date.now() - startTime;

      await supabase.rpc('update_scraping_metrics', {
        p_external_id: job.external_id,
        p_success: success,
        p_duration: duration,
        p_price_changed: false, // We don't track price changes for new extractions
      });

      // Record cost (simplified - would need to track actual AI usage)
      try {
        const today = new Date().toISOString().slice(0, 10);
        await supabase.rpc('rpc_inc_scraping_costs', {
          p_date: today,
          p_properties_scraped: apartments.length,
          p_ai_requests: 1,
          p_tokens_used: 1000, // Estimate
          p_estimated_cost: 0.01, // Estimate
          p_details: { website_type: websiteType, apartments_found: apartments.length },
        });
      } catch (e) {
        console.error('Failed to record scraping cost:', e);
      }

      const newStatus = success ? 'completed' : 'failed';
      await supabase.from('scraping_queue').update({
        status: newStatus,
        completed_at: new Date().toISOString()
      }).eq('external_id', job.external_id).eq('id', job['queue_id']);

      results.push({
        success,
        job,
        website_type: websiteType,
        apartments_found: apartments.length,
        result: extractionResult
      });
    } catch (err) {
      await supabase.rpc('update_scraping_metrics', {
        p_external_id: job.external_id,
        p_success: false,
        p_duration: 0,
        p_price_changed: false,
      });

      const msg = (err && typeof err === 'object' && 'message' in (err as Record<string, unknown>)) ? String((err as Record<string, unknown>)['message']) : String(err);
      results.push({ success: false, job, error: msg });
    }
  }

  return results;
}

export default runProcessor;
