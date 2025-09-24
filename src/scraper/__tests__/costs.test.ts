import { estimateCostFromTokens } from '../costs';

test('estimateCostFromTokens computes reasonable values', () => {
  const cost1 = estimateCostFromTokens('gpt-3.5-turbo', 1000, 500);
  // prompt 1000 @0.0015 + completion 500 @0.002 => (1.5 + 1.0)/1000 = 0.0025
  expect(cost1).toBeCloseTo(0.0025, 6);

  const cost2 = estimateCostFromTokens('gpt-4-turbo-preview', 2000, 1000);
  // prompt 2000 @0.03 + completion 1000 @0.06 => (60 + 60)/1000 = 0.12
  expect(cost2).toBeCloseTo(0.12, 6);
});
