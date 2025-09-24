// Comprehensive amenities parser — simple keyword-based extraction with normalization
export type AmenitiesParseResult = {
  amenities: string[];
  unit_features: string[];
  pet_policy: string | null;
  parking_info: string | null;
};

const AMENITY_CATEGORIES: Record<string, string[]> = {
  unit_features: [
    'hardwood floors', 'walk-in closet', 'balcony', 'fireplace',
    'high ceilings', 'granite countertops', 'stainless steel appliances',
    'dishwasher', 'disposal', 'microwave', 'refrigerator'
  ],
  building_amenities: [
    'fitness center', 'pool', 'rooftop', 'business center',
    'package receiving', 'concierge', 'lounge', 'courtyard',
    'barbecue area', 'clubhouse'
  ],
  services: [
    'utilities included', 'cable included', 'internet included',
    'trash included', 'water included', 'sewer included'
  ],
  pet_policy: [
    'cats allowed', 'dogs allowed', 'pet friendly', 'no pets',
    'pet deposit', 'pet rent', 'breed restrictions'
  ],
  parking: [
    'assigned parking', 'garage parking', 'covered parking',
    'street parking', 'parking included', 'extra parking cost'
  ]
};

function normalize(text?: string): string {
  return (text || '').toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function extractAmenities(description?: string | null): AmenitiesParseResult {
  const desc = normalize(description || '');
  const amenities: string[] = [];
  const unitFeatures: string[] = [];
  let petPolicy: string | null = null;
  let parkingInfo: string | null = null;

  if (!desc) return { amenities, unit_features: unitFeatures, pet_policy: petPolicy, parking_info: parkingInfo };

  for (const [category, keywords] of Object.entries(AMENITY_CATEGORIES)) {
    for (const keyword of keywords) {
      if (desc.includes(keyword)) {
        if (category === 'pet_policy') {
          // choose the first matching pet policy phrase
          if (!petPolicy) petPolicy = keyword;
        } else if (category === 'parking') {
          if (!parkingInfo) parkingInfo = keyword;
        } else if (category === 'unit_features') {
          unitFeatures.push(keyword);
        } else {
          amenities.push(keyword);
        }
      }
    }
  }

  // dedupe while preserving order
  const dedupe = (arr: string[]) => Array.from(new Set(arr));

  return {
    amenities: dedupe(amenities),
    unit_features: dedupe(unitFeatures),
    pet_policy: petPolicy,
    parking_info: parkingInfo
  };
}

export default extractAmenities;
