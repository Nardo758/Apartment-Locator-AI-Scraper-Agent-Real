import { classifyPropertyType } from '../propertyType';

describe('property type classifier', () => {
  test('identifies condo', () => {
    expect(classifyPropertyType('Luxury Condo at Market St', 'Spacious condominium with city views')).toBe('condo');
  });

  test('identifies townhouse and multiunit', () => {
    expect(classifyPropertyType('Townhome near park', 'three story townhome')).toBe('townhouse');
    expect(classifyPropertyType('Duplex for rent', 'two unit duplex')).toBe('multiunit');
  });

  test('defaults to apartment', () => {
    expect(classifyPropertyType('Lovely place', 'Great location with modern finishes')).toBe('apartment');
  });
});
