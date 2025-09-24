export type PropertyType = 'apartment' | 'condo' | 'townhouse' | 'house' | 'multiunit';

export function classifyPropertyType(name?: string | null, description?: string | null): PropertyType {
  const text = ((name || '') + ' ' + (description || '')).toLowerCase();

  if (text.includes('condo') || text.includes('condominium')) return 'condo';
  if (text.includes('townhouse') || text.includes('townhome')) return 'townhouse';
  if (text.includes('duplex') || text.includes('triplex')) return 'multiunit';
  if (text.includes('house') || text.includes('single family')) return 'house';
  if (text.includes('apartment') || text.includes(' apt ' ) || text.includes('\bapt\b')) return 'apartment';

  return 'apartment'; // default
}

export default classifyPropertyType;
