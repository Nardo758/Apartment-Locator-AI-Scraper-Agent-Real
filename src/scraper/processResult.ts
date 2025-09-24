import type { SupabaseClient } from '@supabase/supabase-js';
import * as market from './market';
import { extractAmenities } from './amenities';
import { classifyPropertyType } from './propertyType';

// Minimal helpers: detectSignificantChanges, log helpers are intentionally small and pluggable.
export function detectSignificantChanges(oldData: Record<string, unknown>, newData: Record<string, unknown>): Array<{ field: string; old: unknown; new: unknown }> {
  const changes: Array<{ field: string; old: unknown; new: unknown }> = [];
  const keys = new Set([...Object.keys(oldData || {}), ...Object.keys(newData || {})]);
  for (const k of keys) {
    if (k === 'last_seen_at' || k === 'scrape_count' || k === 'updated_at') continue; // ignore housekeeping
    const a = oldData ? oldData[k] : undefined;
    const b = newData ? newData[k] : undefined;
    // treat null/undefined equivalently
    if (a !== b) changes.push({ field: k, old: a, new: b });
  }
  return changes;
}

async function logScrapingActivity(supabase: SupabaseClient, externalId: string, event: string, payload: Record<string, unknown>) {
  // best-effort logging; swallow errors
  try {
    await supabase.from('scraping_logs').insert({ external_id: externalId, event, payload, created_at: new Date().toISOString() });
  } catch (_err) {
    // ignore logging failures
  }
}

async function logSignificantChanges(supabase: SupabaseClient, externalId: string, changes: unknown[]) {
  try {
    await supabase.from('scraping_change_logs').insert({ external_id: externalId, changes: JSON.stringify(changes), created_at: new Date().toISOString() });
  } catch (_err) {
    // ignore
  }
}

/**
 * Update a property using the server-side RPC `rpc_update_property_with_history` if available,
 * otherwise fall back to a direct update and separately insert price_history when price changed.
 */
export async function updatePropertyWithHistory(supabase: SupabaseClient, externalId: string, payload: Record<string, unknown>) {
  // Attempt RPC first
  try {
    const { data, error } = await supabase.rpc('rpc_update_property_with_history', { p_external_id: externalId, p_payload: payload });
    if (error) throw error;
    return data;
  } catch (_rpcErr) {
    // Fallback path
  const updatePayload: Record<string, unknown> = { ...payload };
  // remove any unsafe keys that RPC would have filtered
  delete (updatePayload as Record<string, unknown>)['external_id'];
  delete (updatePayload as Record<string, unknown>)['id'];

  type CurrentRow = { current_price?: number | null } | null;
  const { data: currentRow } = await supabase.from('scraped_properties').select('current_price').eq('external_id', externalId).maybeSingle() as { data: CurrentRow };
  const oldPriceNum: number | null = currentRow && typeof currentRow.current_price === 'number' ? currentRow.current_price : null;

    const { error: upErr } = await supabase.from('scraped_properties').update(updatePayload).eq('external_id', externalId);
    if (upErr) throw upErr;

    // coerce newPrice from payload if present
    const rawNewPrice = (payload as Record<string, unknown>)['current_price'];
    const newPriceNum = typeof rawNewPrice === 'number' ? rawNewPrice : (typeof rawNewPrice === 'string' && rawNewPrice.trim() !== '' ? Number(rawNewPrice) : null);

    if (newPriceNum !== null && oldPriceNum !== null && newPriceNum !== oldPriceNum) {
      await supabase.from('price_history').insert({ external_id: externalId, price: newPriceNum, change_type: newPriceNum > oldPriceNum ? 'increased' : 'decreased', recorded_at: new Date().toISOString() });
    }

    return { ok: true };
  }
}

/**
 * Process the scraping result by performing change-only updates when no significant changes
 * and full updates (with history) when significant changes are detected.
 */
export async function processScrapingResult(supabase: SupabaseClient, oldData: Record<string, unknown>, newData: Record<string, unknown>) {
  const changes = detectSignificantChanges(oldData, newData);

  if (changes.length === 0) {
    // No significant changes - minimal update
    try {
      const externalId = typeof oldData?.external_id === 'string' ? oldData.external_id : null;
      const oldCount = typeof oldData?.scrape_count === 'number' ? oldData.scrape_count : 0;
        if (externalId) {
          const minimalUpdate: Record<string, unknown> = { last_seen_at: new Date().toISOString(), scrape_count: oldCount + 1 };
          // include geo and other parsed fields if present to keep them fresh
          if (typeof newData?.latitude === 'number' || typeof newData?.latitude === 'string') minimalUpdate.latitude = Number(newData.latitude);
          if (typeof newData?.longitude === 'number' || typeof newData?.longitude === 'string') minimalUpdate.longitude = Number(newData.longitude);
          if (typeof newData?.square_footage === 'number' || typeof newData?.square_footage === 'string') minimalUpdate.square_footage = Number(newData.square_footage);
          // preference: use already-parsed amenities if present, otherwise run the parser over description
          if (newData?.amenities) {
            minimalUpdate.amenities = newData.amenities;
          } else if (typeof newData?.description === 'string') {
            try {
              const parsed = extractAmenities(String(newData.description));
              if (parsed.amenities.length) minimalUpdate.amenities = parsed.amenities;
              if (parsed.unit_features.length) minimalUpdate.unit_features = parsed.unit_features;
              if (parsed.pet_policy) minimalUpdate.pet_policy = parsed.pet_policy;
              if (parsed.parking_info) minimalUpdate.parking_info = parsed.parking_info;
            } catch (_e) {
              // non-fatal: if parser throws for any reason, continue without amenities
            }
          }

          // determine property_type if not already present
          if (!minimalUpdate.property_type) {
            try {
              const inferred = classifyPropertyType(typeof oldData?.name === 'string' ? String(oldData.name) : undefined, typeof newData?.description === 'string' ? String(newData.description) : undefined);
              if (inferred) minimalUpdate.property_type = inferred;
            } catch (_e) {
              // ignore
            }
          }

          // Market intelligence: days_on_market may be present in newData or derived later; compute velocity and concessions heuristics
          try {
            const marketVelocity = market.calculateMarketVelocity({ days_on_market: typeof newData?.days_on_market === 'number' ? Number(newData.days_on_market) : undefined });
            minimalUpdate.market_velocity = marketVelocity;
            const concessions = market.extractConcessions(typeof newData?.description === 'string' ? String(newData.description) : undefined);
            if (concessions.concessionType) {
              minimalUpdate.concession_type = concessions.concessionType;
              minimalUpdate.concession_value = concessions.concessionValue;
            }
          } catch (_e) {
            // non-fatal: if market helpers fail, ignore
          }

          await supabase
            .from('scraped_properties')
            .update(minimalUpdate)
            .eq('external_id', externalId);

          await logScrapingActivity(supabase, externalId, 'no_change', {});
        }
    } catch (err) {
      // best-effort; log and swallow
      const externalId = typeof oldData?.external_id === 'string' ? oldData.external_id : 'unknown';
      await logScrapingActivity(supabase, externalId, 'no_change_error', { error: String(err) });
    }
    return;
  }

  // Significant changes detected - full update via RPC or fallback
  try {
    const externalId = typeof oldData?.external_id === 'string' ? oldData.external_id : null;
      if (externalId) {
      // Enrich newData with market intelligence before full update
      const enriched: Record<string, unknown> = { ...newData };
      // Parse amenities & unit features from description so full update persists structured fields
      try {
        const parsed = extractAmenities(typeof newData?.description === 'string' ? String(newData.description) : undefined);
        enriched.amenities = parsed.amenities;
        enriched.unit_features = parsed.unit_features;
        if (parsed.pet_policy) enriched.pet_policy = parsed.pet_policy;
        if (parsed.parking_info) enriched.parking_info = parsed.parking_info;
      } catch (_e) {
        // ignore parser failures
      }

      // ensure property_type in full update
      try {
        if (!enriched.property_type) {
          enriched.property_type = classifyPropertyType(typeof newData?.name === 'string' ? String(newData.name) : undefined, typeof newData?.description === 'string' ? String(newData.description) : undefined);
        }
      } catch (_e) {
        // ignore
      }
      try {
  enriched.market_velocity = market.calculateMarketVelocity({ days_on_market: typeof newData?.days_on_market === 'number' ? Number(newData.days_on_market) : undefined });
  const concessions = market.extractConcessions(typeof newData?.description === 'string' ? String(newData.description) : undefined);
        if (concessions.concessionType) {
          enriched.concession_type = concessions.concessionType;
          enriched.concession_value = concessions.concessionValue;
        }
      } catch (_e) {
        // ignore
      }

      await updatePropertyWithHistory(supabase, externalId, enriched);
      await logSignificantChanges(supabase, externalId, changes);
    }
  } catch (err) {
    const externalId = typeof oldData?.external_id === 'string' ? oldData.external_id : 'unknown';
    await logScrapingActivity(supabase, externalId, 'update_error', { error: String(err) });
  }
}
