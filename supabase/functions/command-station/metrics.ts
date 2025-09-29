/**
 * Metrics Collection and Analysis for Real Estate Scraper Command Station
 * 
 * Provides comprehensive performance tracking, business metrics analysis,
 * and system monitoring capabilities.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

interface ScrapeLog {
  status?: string;
  confidence_score?: number;
  response_time_ms?: number;
  created_at?: string;
  scrape_duration_ms?: number;
}

interface QueueMetric {
  processed_count?: number;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

interface Source {
  source: string;
}

interface QualityRecord {
  [key: string]: unknown;
}

interface CostRecord {
  estimated_cost?: number;
}

export interface SystemMetrics {
  performance: {
    avg_scrape_time: number;
    success_rate: number;
    throughput_per_hour: number;
    error_rate: number;
    avg_response_time: number;
    queue_processing_rate: number;
  };
  business: {
    properties_monitored: number;
    new_listings_today: number;
    price_changes_today: number;
    active_sources: number;
    data_quality_score: number;
    coverage_percentage: number;
  };
  system: {
    database_size: number;
    function_calls_today: number;
    total_api_calls: number;
    storage_usage: number;
    memory_usage: number;
    cpu_utilization: number;
  };
  costs: {
    daily_cost: number;
    weekly_cost: number;
    monthly_cost: number;
    cost_per_property: number;
    cost_efficiency: number;
    projected_monthly: number;
  };
  claude: {
    requests_today: number;
    avg_confidence: number;
    token_efficiency: number;
    model_performance: {
      accuracy: number;
      speed: number;
      cost_effectiveness: number;
    };
  };
}

export interface TrendData {
  timestamp: string;
  value: number;
  metadata?: Record<string, unknown>;
}

export interface MetricAlert {
  metric: string;
  current_value: number;
  threshold: number;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: string;
}

export class Metrics {
  private static instance: Metrics;
  private supabase?: SupabaseClient;
  private alertThresholds: Record<string, { warning: number; critical: number }>;

  private constructor() {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
    const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    if (SUPABASE_URL && SUPABASE_KEY) {
      this.supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    }

    // Default alert thresholds
    this.alertThresholds = {
      error_rate: { warning: 0.10, critical: 0.25 },
      response_time: { warning: 5000, critical: 10000 }, // milliseconds
      success_rate: { warning: 0.85, critical: 0.70 },
      daily_cost: { warning: 40, critical: 50 },
      queue_size: { warning: 50, critical: 100 },
      data_quality: { warning: 0.80, critical: 0.60 }
    };
  }

  static getInstance(): Metrics {
    if (!Metrics.instance) {
      Metrics.instance = new Metrics();
    }
    return Metrics.instance;
  }

  /**
   * Get comprehensive system metrics
   */
  async getSystemMetrics(): Promise<Response> {
    try {
      const [
        performanceMetrics,
        businessMetrics,
        systemMetrics,
        costMetrics,
        claudeMetrics
      ] = await Promise.all([
        this.getPerformanceMetrics(),
        this.getBusinessMetrics(),
        this.getSystemResourceMetrics(),
        this.getCostMetrics(),
        this.getClaudeMetrics()
      ]);

      const metrics: SystemMetrics = {
        performance: performanceMetrics,
        business: businessMetrics,
        system: systemMetrics,
        costs: costMetrics,
        claude: claudeMetrics
      };

      // Generate alerts based on current metrics
      const alerts = await this.generateMetricAlerts(metrics);

      return new Response(JSON.stringify({
        timestamp: new Date().toISOString(),
        metrics,
        alerts,
        summary: this.generateMetricsSummary(metrics)
      }, null, 2), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Error getting system metrics:', error);
      return new Response(JSON.stringify({
        error: 'Failed to retrieve system metrics',
        message: String(error),
        timestamp: new Date().toISOString()
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * Get trend data for specific metrics over time
   */
  async getTrendData(
    metric: string, 
    timeRange: '1h' | '24h' | '7d' | '30d' = '24h',
    granularity: '5m' | '1h' | '6h' | '1d' = '1h'
  ): Promise<Response> {
    try {
      const endTime = new Date();
      let startTime: Date;

      switch (timeRange) {
        case '1h':
          startTime = new Date(endTime.getTime() - 60 * 60 * 1000);
          break;
        case '24h':
          startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startTime = new Date(endTime.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startTime = new Date(endTime.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
      }

      const trendData = await this.fetchTrendData(metric, startTime, endTime, granularity);

      return new Response(JSON.stringify({
        metric,
        timeRange,
        granularity,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        data: trendData,
        statistics: this.calculateTrendStatistics(trendData)
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Error getting trend data:', error);
      return new Response(JSON.stringify({
        error: 'Failed to retrieve trend data',
        message: String(error)
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * Get performance benchmarks and comparisons
   */
  async getPerformanceBenchmarks(): Promise<Response> {
    try {
      const benchmarks = await this.calculatePerformanceBenchmarks();

      return new Response(JSON.stringify({
        timestamp: new Date().toISOString(),
        benchmarks,
        recommendations: this.generatePerformanceRecommendations(benchmarks)
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Error getting performance benchmarks:', error);
      return new Response(JSON.stringify({
        error: 'Failed to retrieve performance benchmarks',
        message: String(error)
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  // Private helper methods

  private async getPerformanceMetrics(): Promise<SystemMetrics['performance']> {
    if (!this.supabase) {
      return {
        avg_scrape_time: 0,
        success_rate: 0,
        throughput_per_hour: 0,
        error_rate: 0,
        avg_response_time: 0,
        queue_processing_rate: 0
      };
    }

    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

      // Get scraping logs for performance analysis
      const { data: logs } = await this.supabase
        .from('scraping_logs')
        .select('*')
        .gte('created_at', oneDayAgo);

      let avgScrapeTime = 0;
      let successRate = 0;
      let avgResponseTime = 0;
      let errorRate = 0;

      if (logs && logs.length > 0) {
        // Calculate average scrape time
        const scrapeTimes = logs
          .filter((log: ScrapeLog) => log.scrape_duration_ms)
          .map((log: ScrapeLog) => log.scrape_duration_ms!);
        
        if (scrapeTimes.length > 0) {
          avgScrapeTime = scrapeTimes.reduce((sum: number, time: number) => sum + time, 0) / scrapeTimes.length;
        }

        // Calculate success rate
        const successful = logs.filter((log: ScrapeLog) => log.status === 'success').length;
        successRate = successful / logs.length;

        // Calculate average response time
        const responseTimes = logs
          .filter((log: ScrapeLog) => log.response_time_ms)
          .map((log: ScrapeLog) => log.response_time_ms!);
        
        if (responseTimes.length > 0) {
          avgResponseTime = responseTimes.reduce((sum: number, time: number) => sum + time, 0) / responseTimes.length;
        }

        // Calculate error rate
        const errors = logs.filter((log: ScrapeLog) => log.status === 'error').length;
        errorRate = errors / logs.length;
      }

      // Calculate throughput (last hour)
      const recentLogs = logs?.filter((log: ScrapeLog) => log.created_at && log.created_at >= oneHourAgo) || [];
      const throughputPerHour = recentLogs.length;

      // Calculate queue processing rate
      const { data: queueMetrics } = await this.supabase
        .from('scraping_queue')
        .select('status, created_at, updated_at')
        .gte('updated_at', oneHourAgo);

      let queueProcessingRate = 0;
      if (queueMetrics && queueMetrics.length > 0) {
        const processed = queueMetrics.filter((item: QueueMetric) => 
          item.status === 'completed' || item.status === 'failed'
        ).length;
        queueProcessingRate = processed;
      }

      return {
        avg_scrape_time: Math.round(avgScrapeTime),
        success_rate: Math.round(successRate * 10000) / 100, // Percentage with 2 decimals
        throughput_per_hour: throughputPerHour,
        error_rate: Math.round(errorRate * 10000) / 100,
        avg_response_time: Math.round(avgResponseTime),
        queue_processing_rate: queueProcessingRate
      };

    } catch (error) {
      console.error('Error getting performance metrics:', error);
      return {
        avg_scrape_time: 0,
        success_rate: 0,
        throughput_per_hour: 0,
        error_rate: 0,
        avg_response_time: 0,
        queue_processing_rate: 0
      };
    }
  }

  private async getBusinessMetrics(): Promise<SystemMetrics['business']> {
    if (!this.supabase) {
      return {
        properties_monitored: 0,
        new_listings_today: 0,
        price_changes_today: 0,
        active_sources: 0,
        data_quality_score: 0,
        coverage_percentage: 0
      };
    }

    try {
      const today = new Date().toISOString().slice(0, 10);
      const _yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

      // Get total properties monitored
      const { count: propertiesMonitored } = await this.supabase
        .from('apartments')
        .select('*', { count: 'exact' })
        .eq('is_active', true);

      // Get new listings today
      const { count: newListingsToday } = await this.supabase
        .from('apartments')
        .select('*', { count: 'exact' })
        .gte('scraped_at', `${today}T00:00:00.000Z`)
        .lt('scraped_at', `${today}T23:59:59.999Z`);

      // Get price changes today (simplified - would need price history table)
      const { count: priceChangesToday } = await this.supabase
        .from('apartments')
        .select('*', { count: 'exact' })
        .gte('updated_at', `${today}T00:00:00.000Z`)
        .neq('rent_price', null);

      // Get active sources
      const { data: sources } = await this.supabase
        .from('apartments')
        .select('source')
        .eq('is_active', true);

      const activeSources = sources ? new Set(sources.map((s: Source) => s.source)).size : 0;

      // Calculate data quality score (percentage of complete records)
      const { data: qualityData } = await this.supabase
        .from('apartments')
        .select('title, address, city, state, rent_price, bedrooms, bathrooms')
        .eq('is_active', true)
        .limit(1000); // Sample for performance

      let dataQualityScore = 0;
      if (qualityData && qualityData.length > 0) {
        const completeRecords = qualityData.filter((record: QualityRecord) => {
          const requiredFields = ['title', 'address', 'city', 'state', 'rent_price'];
          return requiredFields.every(field => record[field] != null && record[field] !== '');
        }).length;
        
        dataQualityScore = completeRecords / qualityData.length;
      }

      // Calculate coverage percentage (simplified)
      const coveragePercentage = Math.min(100, (activeSources / 10) * 100); // Assuming 10 target sources

      return {
        properties_monitored: propertiesMonitored || 0,
        new_listings_today: newListingsToday || 0,
        price_changes_today: priceChangesToday || 0,
        active_sources: activeSources,
        data_quality_score: Math.round(dataQualityScore * 10000) / 100,
        coverage_percentage: Math.round(coveragePercentage * 100) / 100
      };

    } catch (error) {
      console.error('Error getting business metrics:', error);
      return {
        properties_monitored: 0,
        new_listings_today: 0,
        price_changes_today: 0,
        active_sources: 0,
        data_quality_score: 0,
        coverage_percentage: 0
      };
    }
  }

  private async getSystemResourceMetrics(): Promise<SystemMetrics['system']> {
    if (!this.supabase) {
      return {
        database_size: 0,
        function_calls_today: 0,
        total_api_calls: 0,
        storage_usage: 0,
        memory_usage: 0,
        cpu_utilization: 0
      };
    }

    try {
      const today = new Date().toISOString().slice(0, 10);

      // Get database size (approximate)
      const { data: dbStats } = await this.supabase
        .rpc('get_database_size');

      // Get function calls today
      const { count: functionCallsToday } = await this.supabase
        .from('scraping_logs')
        .select('*', { count: 'exact' })
        .gte('created_at', `${today}T00:00:00.000Z`);

      // Get total API calls (from cost tracking)
      const { data: apiCalls } = await this.supabase
        .from('scraping_costs')
        .select('ai_requests')
        .eq('date', today)
        .single();

      return {
        database_size: dbStats?.size || 0,
        function_calls_today: functionCallsToday || 0,
        total_api_calls: apiCalls?.ai_requests || 0,
        storage_usage: 0, // Would need to implement storage monitoring
        memory_usage: 0, // Would need system-level monitoring
        cpu_utilization: 0 // Would need system-level monitoring
      };

    } catch (error) {
      console.error('Error getting system resource metrics:', error);
      return {
        database_size: 0,
        function_calls_today: 0,
        total_api_calls: 0,
        storage_usage: 0,
        memory_usage: 0,
        cpu_utilization: 0
      };
    }
  }

  private async getCostMetrics(): Promise<SystemMetrics['costs']> {
    if (!this.supabase) {
      return {
        daily_cost: 0,
        weekly_cost: 0,
        monthly_cost: 0,
        cost_per_property: 0,
        cost_efficiency: 0,
        projected_monthly: 0
      };
    }

    try {
      const today = new Date().toISOString().slice(0, 10);
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

      // Get cost data
      const { data: dailyCost } = await this.supabase
        .from('scraping_costs')
        .select('estimated_cost, properties_scraped')
        .eq('date', today)
        .single();

      const { data: weeklyCosts } = await this.supabase
        .from('scraping_costs')
        .select('estimated_cost')
        .gte('date', weekAgo);

      const { data: monthlyCosts } = await this.supabase
        .from('scraping_costs')
        .select('estimated_cost')
        .gte('date', monthAgo);

      const dailyCostAmount = dailyCost?.estimated_cost || 0;
      const weeklyCostAmount = weeklyCosts?.reduce((sum: number, cost: CostRecord) => sum + (cost.estimated_cost || 0), 0) || 0;
      const monthlyCostAmount = monthlyCosts?.reduce((sum: number, cost: CostRecord) => sum + (cost.estimated_cost || 0), 0) || 0;

      const propertiesScrapedToday = dailyCost?.properties_scraped || 0;
      const costPerProperty = propertiesScrapedToday > 0 ? dailyCostAmount / propertiesScrapedToday : 0;

      // Calculate cost efficiency (properties per dollar)
      const costEfficiency = dailyCostAmount > 0 ? propertiesScrapedToday / dailyCostAmount : 0;

      // Project monthly cost based on daily average
      const projectedMonthly = dailyCostAmount * 30;

      return {
        daily_cost: Math.round(dailyCostAmount * 10000) / 10000,
        weekly_cost: Math.round(weeklyCostAmount * 10000) / 10000,
        monthly_cost: Math.round(monthlyCostAmount * 10000) / 10000,
        cost_per_property: Math.round(costPerProperty * 10000) / 10000,
        cost_efficiency: Math.round(costEfficiency * 100) / 100,
        projected_monthly: Math.round(projectedMonthly * 100) / 100
      };

    } catch (error) {
      console.error('Error getting cost metrics:', error);
      return {
        daily_cost: 0,
        weekly_cost: 0,
        monthly_cost: 0,
        cost_per_property: 0,
        cost_efficiency: 0,
        projected_monthly: 0
      };
    }
  }

  private async getClaudeMetrics(): Promise<SystemMetrics['claude']> {
    if (!this.supabase) {
      return {
        requests_today: 0,
        avg_confidence: 0,
        token_efficiency: 0,
        model_performance: {
          accuracy: 0,
          speed: 0,
          cost_effectiveness: 0
        }
      };
    }

    try {
      const today = new Date().toISOString().slice(0, 10);
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      // Get today's requests
      const { data: costData } = await this.supabase
        .from('scraping_costs')
        .select('ai_requests, tokens_used, estimated_cost, details')
        .eq('date', today)
        .single();

      const requestsToday = costData?.ai_requests || 0;
      const tokensUsed = costData?.tokens_used || 0;
      const cost = costData?.estimated_cost || 0;

      // Get confidence scores from recent successful extractions
      const { data: recentLogs } = await this.supabase
        .from('scraping_logs')
        .select('confidence_score, response_time_ms, status')
        .eq('status', 'success')
        .gte('created_at', oneDayAgo)
        .limit(100);

      let avgConfidence = 0;
      let avgSpeed = 0;
      let accuracy = 0;

      if (recentLogs && recentLogs.length > 0) {
        // Calculate average confidence
        const confidenceScores = recentLogs
          .filter((log: ScrapeLog) => log.confidence_score != null)
          .map((log: ScrapeLog) => log.confidence_score!);
        
        if (confidenceScores.length > 0) {
          avgConfidence = confidenceScores.reduce((sum: number, score: number) => sum + score, 0) / confidenceScores.length;
        }

        // Calculate average response speed
        const responseTimes = recentLogs
          .filter((log: ScrapeLog) => log.response_time_ms != null)
          .map((log: ScrapeLog) => log.response_time_ms!);
        
        if (responseTimes.length > 0) {
          avgSpeed = responseTimes.reduce((sum: number, time: number) => sum + time, 0) / responseTimes.length;
        }

        // Accuracy is same as confidence for now
        accuracy = avgConfidence;
      }

      // Calculate token efficiency (tokens per request)
      const tokenEfficiency = requestsToday > 0 ? tokensUsed / requestsToday : 0;

      // Calculate cost effectiveness (successful extractions per dollar)
      const costEffectiveness = cost > 0 ? recentLogs?.length / cost || 0 : 0;

      return {
        requests_today: requestsToday,
        avg_confidence: Math.round(avgConfidence * 10000) / 100,
        token_efficiency: Math.round(tokenEfficiency),
        model_performance: {
          accuracy: Math.round(accuracy * 10000) / 100,
          speed: Math.round(avgSpeed),
          cost_effectiveness: Math.round(costEffectiveness * 100) / 100
        }
      };

    } catch (error) {
      console.error('Error getting Claude metrics:', error);
      return {
        requests_today: 0,
        avg_confidence: 0,
        token_efficiency: 0,
        model_performance: {
          accuracy: 0,
          speed: 0,
          cost_effectiveness: 0
        }
      };
    }
  }

  private generateMetricAlerts(metrics: SystemMetrics): MetricAlert[] {
    const alerts: MetricAlert[] = [];
    const timestamp = new Date().toISOString();

    // Check error rate
    if (metrics.performance.error_rate >= this.alertThresholds.error_rate.critical) {
      alerts.push({
        metric: 'error_rate',
        current_value: metrics.performance.error_rate,
        threshold: this.alertThresholds.error_rate.critical,
        severity: 'critical',
        message: `Critical error rate detected: ${metrics.performance.error_rate}%`,
        timestamp
      });
    } else if (metrics.performance.error_rate >= this.alertThresholds.error_rate.warning) {
      alerts.push({
        metric: 'error_rate',
        current_value: metrics.performance.error_rate,
        threshold: this.alertThresholds.error_rate.warning,
        severity: 'warning',
        message: `High error rate detected: ${metrics.performance.error_rate}%`,
        timestamp
      });
    }

    // Check success rate
    if (metrics.performance.success_rate <= this.alertThresholds.success_rate.critical) {
      alerts.push({
        metric: 'success_rate',
        current_value: metrics.performance.success_rate,
        threshold: this.alertThresholds.success_rate.critical,
        severity: 'critical',
        message: `Critical success rate: ${metrics.performance.success_rate}%`,
        timestamp
      });
    }

    // Check daily cost
    if (metrics.costs.daily_cost >= this.alertThresholds.daily_cost.critical) {
      alerts.push({
        metric: 'daily_cost',
        current_value: metrics.costs.daily_cost,
        threshold: this.alertThresholds.daily_cost.critical,
        severity: 'critical',
        message: `Daily cost limit exceeded: $${metrics.costs.daily_cost}`,
        timestamp
      });
    }

    // Check data quality
    if (metrics.business.data_quality_score <= this.alertThresholds.data_quality.critical) {
      alerts.push({
        metric: 'data_quality',
        current_value: metrics.business.data_quality_score,
        threshold: this.alertThresholds.data_quality.critical,
        severity: 'critical',
        message: `Poor data quality detected: ${metrics.business.data_quality_score}%`,
        timestamp
      });
    }

    return alerts;
  }

  private generateMetricsSummary(metrics: SystemMetrics): string {
    const summary = [];
    
    if (metrics.performance.success_rate >= 95) {
      summary.push('🟢 Excellent performance');
    } else if (metrics.performance.success_rate >= 85) {
      summary.push('🟡 Good performance');
    } else {
      summary.push('🔴 Performance needs attention');
    }

    if (metrics.costs.daily_cost <= this.alertThresholds.daily_cost.warning) {
      summary.push('💚 Costs under control');
    } else {
      summary.push('💰 High cost usage');
    }

    if (metrics.business.data_quality_score >= 90) {
      summary.push('✅ High data quality');
    } else {
      summary.push('⚠️ Data quality issues');
    }

    return summary.join(' | ');
  }

  private fetchTrendData(_metric: string, _startTime: Date, _endTime: Date, _granularity: string): TrendData[] {
    // This would implement actual trend data fetching based on the metric type
    // For now, returning empty array as placeholder
    return [];
  }

  private calculateTrendStatistics(data: TrendData[]): { avg: number; min: number; max: number; count: number } {
    if (data.length === 0) return { avg: 0, min: 0, max: 0, count: 0 };

    const values = data.map(d => d.value);
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);

    return { avg, min, max, count: values.length };
  }

  private calculatePerformanceBenchmarks(): Record<string, unknown> {
    // Implementation would calculate performance benchmarks
    // against historical data or industry standards
    return {};
  }

  private generatePerformanceRecommendations(_benchmarks: Record<string, unknown>): string[] {
    // Implementation would generate actionable performance recommendations
    return [];
  }
}

// Export singleton instance
export const metrics = Metrics.getInstance();