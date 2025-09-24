export type PropertyRecord = {
  days_on_market?: number | null;
  price_changes_count?: number | null;
  description?: string | null;
};

export function calculateMarketVelocity(property: PropertyRecord): 'hot' | 'normal' | 'slow' | 'stale' {
  const daysOnMarket = typeof property.days_on_market === 'number' ? property.days_on_market : 0;
  // const priceChanges = typeof property.price_changes_count === 'number' ? property.price_changes_count : 0;

  if (daysOnMarket <= 7) return 'hot';
  if (daysOnMarket <= 21) return 'normal';
  if (daysOnMarket <= 45) return 'slow';
  return 'stale';
}

export function extractConcessions(description?: string | null): { concessionValue: number; concessionType: string | null } {
  if (!description) return { concessionValue: 0, concessionType: null };
  const concessionKeywords: Record<string, string[]> = {
    free_rent: ['free rent', 'one month free', 'rent concession'],
    reduced_deposit: ['reduced deposit', 'deposit special'],
    waived_fees: ['waived fee', 'no application fee', 'admin fee waived'],
  };

  const desc = description.toLowerCase();
  let concessionValue = 0;
  let concessionType: string | null = null;

  // Simple heuristic: look for dollar amounts with concession keywords
  const dollarMatch = desc.match(/\$(\d+)/);
  const concessionAmount = dollarMatch ? parseInt(dollarMatch[1], 10) : 0;

  for (const [type, keywords] of Object.entries(concessionKeywords)) {
    if (keywords.some((keyword) => desc.includes(keyword))) {
      concessionType = type;
      concessionValue = concessionAmount || 100; // Default value when not specified
      break;
    }
  }

  return { concessionValue, concessionType };
}
