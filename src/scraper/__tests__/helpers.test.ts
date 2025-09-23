import { calculateStabilityScore, getRecommendedFrequency } from '../orchestrator';

describe('stability helpers', () => {
  test('calculateStabilityScore clamps and scales', () => {
    const p1 = { price_changes: 0, days_on_market: 5 } as any;
    const score1 = calculateStabilityScore(p1);
    expect(typeof score1).toBe('number');
    expect(score1).toBeGreaterThanOrEqual(0);
    expect(score1).toBeLessThanOrEqual(100);

    const p2 = { price_changes: 10, days_on_market: 400 } as any;
    const score2 = calculateStabilityScore(p2);
    expect(score2).toBeGreaterThanOrEqual(0);
    expect(score2).toBeLessThanOrEqual(100);
    expect(score2).toBeLessThanOrEqual(score1);
  });

  test('getRecommendedFrequency maps score to days', () => {
    expect(getRecommendedFrequency(10)).toBe(1);
    expect(getRecommendedFrequency(40)).toBe(7);
    expect(getRecommendedFrequency(60)).toBe(14);
    expect(getRecommendedFrequency(90)).toBe(30);
  });
});
