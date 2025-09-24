/**
 * @jest-environment node
 */

import { getOptimalAIModel, optimizeAIPrompt } from '../modelSelection';
import { calculateStabilityScore } from '../orchestrator';

jest.mock('../orchestrator', () => ({
  calculateStabilityScore: jest.fn(),
}));

const mocked = calculateStabilityScore as jest.MockedFunction<typeof calculateStabilityScore>;

describe('model selection', () => {
  afterEach(() => mocked.mockReset());

  test('very stable -> cheap model', () => {
    mocked.mockReturnValue(0.9 as any);
    expect(getOptimalAIModel({} as unknown)).toBe('gpt-3.5-turbo');
  });

  test('moderately stable -> balanced model', () => {
    mocked.mockReturnValue(0.6 as any);
    expect(getOptimalAIModel({} as unknown)).toBe('gpt-3.5-turbo-16k');
  });

  test('volatile -> best model', () => {
    mocked.mockReturnValue(0.2 as any);
    expect(getOptimalAIModel({} as unknown)).toBe('gpt-4-turbo-preview');
  });

  test('prompt compact for stable', () => {
    mocked.mockReturnValue(0.85 as any);
    const prompt = optimizeAIPrompt('<html>some content</html>', {} as unknown);
    expect(prompt).toContain('Check ONLY for changes');
    expect(prompt.length).toBeLessThan(6000);
  });

  test('full extraction for volatile', () => {
    mocked.mockReturnValue(0.1 as any);
    const prompt = optimizeAIPrompt('<html>lots of content</html>', {} as unknown);
    expect(prompt).toContain('Extract all apartment listing data');
  });
});
