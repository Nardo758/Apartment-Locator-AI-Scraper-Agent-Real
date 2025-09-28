/**
 * Cost Tracker Module for AI API Monitoring
 * 
 * This module provides comprehensive cost tracking and monitoring
 * for OpenAI and Anthropic API usage during testing and production.
 */

export interface ApiUsage {
  service: 'openai' | 'anthropic';
  model: string;
  inputTokens: number;
  outputTokens: number;
  timestamp: Date;
  requestId?: string;
}

export interface CostBreakdown {
  openai: {
    input: number;
    output: number;
    total: number;
    calls: number;
  };
  anthropic: {
    input: number;
    output: number;
    total: number;
    calls: number;
  };
  totalCost: number;
  totalTokens: number;
  totalCalls: number;
}

export class ApiCostTracker {
  private usage: ApiUsage[] = [];
  private alerts: ((cost: number, threshold: number) => void)[] = [];
  
  // Current pricing as of 2024 (per 1M tokens)
  private readonly PRICING = {
    openai: {
      'gpt-4-turbo-preview': { input: 10.00, output: 30.00 },
      'gpt-4-turbo': { input: 10.00, output: 30.00 },
      'gpt-4': { input: 30.00, output: 60.00 },
      'gpt-3.5-turbo': { input: 1.50, output: 2.00 },
      'gpt-3.5-turbo-16k': { input: 3.00, output: 4.00 }
    },
    anthropic: {
      'claude-3-haiku': { input: 0.80, output: 4.00 },
      'claude-3-sonnet': { input: 15.00, output: 75.00 },
      'claude-3-opus': { input: 75.00, output: 225.00 }
    }
  };

  /**
   * Track a single API call
   */
  trackApiCall(usage: ApiUsage): number {
    this.usage.push(usage);
    
    const pricing = this.PRICING[usage.service]?.[usage.model as keyof typeof this.PRICING[typeof usage.service]];
    if (!pricing) {
      console.warn(`Unknown pricing for ${usage.service}:${usage.model}, using default rates`);
      return 0;
    }
    
    const inputCost = (usage.inputTokens * pricing.input) / 1_000_000;
    const outputCost = (usage.outputTokens * pricing.output) / 1_000_000;
    const totalCost = inputCost + outputCost;
    
    // Check alerts
    const currentTotalCost = this.getTotalCost();
    this.alerts.forEach(alertFn => {
      // You can set different thresholds in the alert function
    });
    
    return totalCost;
  }

  /**
   * Get comprehensive cost breakdown
   */
  getCostBreakdown(): CostBreakdown {
    const breakdown: CostBreakdown = {
      openai: { input: 0, output: 0, total: 0, calls: 0 },
      anthropic: { input: 0, output: 0, total: 0, calls: 0 },
      totalCost: 0,
      totalTokens: 0,
      totalCalls: 0
    };

    this.usage.forEach(usage => {
      const pricing = this.PRICING[usage.service]?.[usage.model as keyof typeof this.PRICING[typeof usage.service]];
      if (!pricing) return;

      const inputCost = (usage.inputTokens * pricing.input) / 1_000_000;
      const outputCost = (usage.outputTokens * pricing.output) / 1_000_000;

      breakdown[usage.service].input += inputCost;
      breakdown[usage.service].output += outputCost;
      breakdown[usage.service].total += inputCost + outputCost;
      breakdown[usage.service].calls++;
      
      breakdown.totalTokens += usage.inputTokens + usage.outputTokens;
      breakdown.totalCalls++;
    });

    breakdown.totalCost = breakdown.openai.total + breakdown.anthropic.total;
    return breakdown;
  }

  /**
   * Get total cost across all services
   */
  getTotalCost(): number {
    return this.getCostBreakdown().totalCost;
  }

  /**
   * Get usage statistics for a specific time period
   */
  getUsageInPeriod(startDate: Date, endDate: Date): ApiUsage[] {
    return this.usage.filter(usage => 
      usage.timestamp >= startDate && usage.timestamp <= endDate
    );
  }

  /**
   * Get cost projection based on current usage
   */
  getProjection(periodHours: number = 24): { 
    projectedCost: number; 
    projectedCalls: number; 
    projectedTokens: number;
    basis: string;
  } {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const recentUsage = this.getUsageInPeriod(oneHourAgo, now);
    
    if (recentUsage.length === 0) {
      return { 
        projectedCost: 0, 
        projectedCalls: 0, 
        projectedTokens: 0,
        basis: 'No recent usage data'
      };
    }

    const hourlyRate = recentUsage.length;
    const hourlyCost = recentUsage.reduce((sum, usage) => {
      const pricing = this.PRICING[usage.service]?.[usage.model as keyof typeof this.PRICING[typeof usage.service]];
      if (!pricing) return sum;
      return sum + ((usage.inputTokens * pricing.input) + (usage.outputTokens * pricing.output)) / 1_000_000;
    }, 0);
    const hourlyTokens = recentUsage.reduce((sum, usage) => sum + usage.inputTokens + usage.outputTokens, 0);

    return {
      projectedCost: hourlyCost * periodHours,
      projectedCalls: hourlyRate * periodHours,
      projectedTokens: hourlyTokens * periodHours,
      basis: `Based on ${recentUsage.length} calls in the last hour`
    };
  }

  /**
   * Add cost alert callback
   */
  addCostAlert(threshold: number, callback: (cost: number, threshold: number) => void): void {
    this.alerts.push((cost) => {
      if (cost > threshold) {
        callback(cost, threshold);
      }
    });
  }

  /**
   * Export usage data for analysis
   */
  exportUsageData(): string {
    return JSON.stringify({
      exportDate: new Date().toISOString(),
      totalUsage: this.usage.length,
      costBreakdown: this.getCostBreakdown(),
      usage: this.usage.map(u => ({
        ...u,
        timestamp: u.timestamp.toISOString()
      }))
    }, null, 2);
  }

  /**
   * Generate a detailed cost report
   */
  generateReport(): string {
    const breakdown = this.getCostBreakdown();
    const projection = this.getProjection(24);
    
    let report = "🔍 API COST ANALYSIS REPORT\n";
    report += "=" .repeat(50) + "\n\n";
    
    report += "📊 Current Usage:\n";
    report += `   Total Calls: ${breakdown.totalCalls.toLocaleString()}\n`;
    report += `   Total Tokens: ${breakdown.totalTokens.toLocaleString()}\n`;
    report += `   Total Cost: $${breakdown.totalCost.toFixed(4)}\n\n`;
    
    if (breakdown.openai.calls > 0) {
      report += "🤖 OpenAI Usage:\n";
      report += `   Calls: ${breakdown.openai.calls}\n`;
      report += `   Input Cost: $${breakdown.openai.input.toFixed(4)}\n`;
      report += `   Output Cost: $${breakdown.openai.output.toFixed(4)}\n`;
      report += `   Total: $${breakdown.openai.total.toFixed(4)}\n\n`;
    }
    
    if (breakdown.anthropic.calls > 0) {
      report += "🧠 Anthropic Usage:\n";
      report += `   Calls: ${breakdown.anthropic.calls}\n`;
      report += `   Input Cost: $${breakdown.anthropic.input.toFixed(4)}\n`;
      report += `   Output Cost: $${breakdown.anthropic.output.toFixed(4)}\n`;
      report += `   Total: $${breakdown.anthropic.total.toFixed(4)}\n\n`;
    }
    
    report += "📈 24-Hour Projection:\n";
    report += `   Projected Calls: ${projection.projectedCalls}\n`;
    report += `   Projected Tokens: ${projection.projectedTokens.toLocaleString()}\n`;
    report += `   Projected Cost: $${projection.projectedCost.toFixed(2)}\n`;
    report += `   Basis: ${projection.basis}\n\n`;
    
    // Monthly projections
    const monthlyCost = projection.projectedCost * 30;
    report += "📅 Monthly Projection:\n";
    report += `   Estimated Monthly Cost: $${monthlyCost.toFixed(2)}\n`;
    
    if (monthlyCost > 1000) {
      report += "   ⚠️  High monthly cost projected!\n";
    } else if (monthlyCost > 100) {
      report += "   📋 Moderate monthly cost projected\n";
    } else {
      report += "   ✅ Reasonable monthly cost projected\n";
    }
    
    return report;
  }

  /**
   * Reset all tracking data
   */
  reset(): void {
    this.usage = [];
    this.alerts = [];
  }
}

// Utility functions for common operations
export function createCostTracker(): ApiCostTracker {
  return new ApiCostTracker();
}

export function trackOpenAICall(
  tracker: ApiCostTracker,
  model: string,
  inputTokens: number,
  outputTokens: number,
  requestId?: string
): number {
  return tracker.trackApiCall({
    service: 'openai',
    model,
    inputTokens,
    outputTokens,
    timestamp: new Date(),
    requestId
  });
}

export function trackAnthropicCall(
  tracker: ApiCostTracker,
  model: string,
  inputTokens: number,
  outputTokens: number,
  requestId?: string
): number {
  return tracker.trackApiCall({
    service: 'anthropic',
    model,
    inputTokens,
    outputTokens,
    timestamp: new Date(),
    requestId
  });
}