import { extractAmenities } from '../amenities';

describe('amenities parser', () => {
  test('extracts building amenities and unit features', () => {
    const desc = `Beautiful unit with hardwood floors, stainless steel appliances and granite countertops. Building has a fitness center and pool, plus a rooftop lounge.`;
    const parsed = extractAmenities(desc);
    expect(parsed.unit_features).toEqual(expect.arrayContaining(['hardwood floors', 'stainless steel appliances', 'granite countertops']));
    expect(parsed.amenities).toEqual(expect.arrayContaining(['fitness center', 'pool', 'rooftop']));
    expect(parsed.pet_policy).toBeNull();
    expect(parsed.parking_info).toBeNull();
  });

  test('handles pet policy and parking phrases', () => {
    const desc = `Pets allowed: cats allowed and dogs allowed. Assigned parking available.`;
    const parsed = extractAmenities(desc);
    expect(parsed.pet_policy).toBe('cats allowed'); // first matching
    expect(parsed.parking_info).toBe('assigned parking');
  });

  test('returns empty values for undefined description', () => {
    const parsed = extractAmenities(undefined);
    expect(parsed.amenities).toEqual([]);
    expect(parsed.unit_features).toEqual([]);
    expect(parsed.pet_policy).toBeNull();
    expect(parsed.parking_info).toBeNull();
  });
});
