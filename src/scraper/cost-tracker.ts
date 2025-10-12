interface PricingTier {
  input: number;
  output: number;
}

interface ClaudePricing {
  [model: string]: PricingTier;
}

const CLAUDE_PRICING: ClaudePricing = {
  "claude-3-haiku-20240307": { input: 0.80, output: 4.00 },
  "claude-3-sonnet-20240229": { input: 15.00, output: 75.00 },
  "claude-3-opus-20240229": { input: 75.00, output: 225.00 },
};

export interface UsageMetrics {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCost: number;
  model: string;
}

export class CostTracker {
  static calculateCost(
    model: string,
    inputTokens: number,
    outputTokens: number
  ): UsageMetrics {
    const pricing = CLAUDE_PRICING[model] || CLAUDE_PRICING["claude-3-haiku-20240307"];

    const estimatedCost = (
      (inputTokens * pricing.input) +
      (outputTokens * pricing.output)
    ) / 1000000;

    return {
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      estimatedCost: Number(estimatedCost.toFixed(6)),
      model
    };
  }
}
