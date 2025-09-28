import type { SupabaseClient } from '@supabase/supabase-js';
import { existsSync } from 'node:fs';
import { resolve, isAbsolute } from 'node:path';
import * as process from 'node:process';

export type PricingResult = {
  ai_price: number;
  effective_price: number;
  market_position: 'below' | 'neutral' | 'above';
  percentile_rank: number | null;
};

// Heuristic fallback pricing implementation (kept similar to previous logic).
function heuristicCompute(_supabase: SupabaseClient | undefined, property: Record<string, unknown>): PricingResult {
  const currentPrice = typeof property.current_price === 'number' ? property.current_price : (typeof property.price === 'number' ? property.price : Number(property['price'] ?? 0));
  const sqft = typeof property.square_footage === 'number' ? property.square_footage : (typeof property.square_footage === 'string' ? Number(property.square_footage) : undefined);

  let base = currentPrice || 0;
  if (!base && sqft && sqft > 0) base = Math.round((property['price'] ? Number(property['price']) : 0));

  const amenities = Array.isArray(property.amenities) ? property.amenities.length : 0;
  const unitFeatures = Array.isArray(property.unit_features) ? property.unit_features.length : 0;
  const amenityCount = amenities + unitFeatures;
  const amenityBoost = Math.min(amenityCount * 0.03, 0.25);

  const velocity = (property.market_velocity as string) ?? '';
  let velocityAdj = 0;
  if (velocity === 'hot') velocityAdj = 0.05;
  else if (velocity === 'normal') velocityAdj = 0;
  else if (velocity === 'slow') velocityAdj = -0.05;
  else if (velocity === 'stale') velocityAdj = -0.10;

  const aiPriceFloat = Math.max(0, base * (1 + amenityBoost + velocityAdj));
  const ai_price = Math.round(aiPriceFloat);

  const concession = typeof property.concession_value === 'number' ? property.concession_value : 0;
  const effective_price = Math.max(0, ai_price - Math.round(concession));

  let market_position: PricingResult['market_position'] = 'neutral';
  if (currentPrice > 0) {
    if (effective_price < currentPrice * 0.95) market_position = 'below';
    else if (effective_price > currentPrice * 1.05) market_position = 'above';
  }

  const percentile_rank = null;
  return { ai_price, effective_price, market_position, percentile_rank };
}

/**
 * computeAiPricing - top-level entrypoint used by the scraper and backfill.
 * It will try to load an advanced pricing module when pointed to by
 * PRICING_ADVANCED_MODULE_PATH (env var) and call its `computeAiPricing(supabase, property)`.
 * If loading fails or the module does not export the function, falls back to the heuristic.
 */
export async function computeAiPricing(supabase: SupabaseClient | undefined, property: Record<string, unknown>): Promise<PricingResult> {
  const customPath = process.env.PRICING_ADVANCED_MODULE_PATH;
  if (customPath) {
    try {
      const resolved = isAbsolute(customPath) ? customPath : resolve(process.cwd(), customPath);
      if (existsSync(resolved)) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const mod = require(resolved);
        if (mod && typeof mod.computeAiPricing === 'function') {
          // allow advanced module to be sync or async
          const result = await mod.computeAiPricing(supabase, property);
          return result;
        }
      }
    } catch (err) {
      // keep working on error and fall back to heuristic
      // eslint-disable-next-line no-console
      console.warn('Failed to load advanced pricing module, falling back to heuristic:', String(err));
    }
  }

  return heuristicCompute(supabase, property);
}

export default computeAiPricing;
