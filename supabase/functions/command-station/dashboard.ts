/**
 * Real-time Dashboard for Real Estate Scraper Command Station
 * 
 * Provides comprehensive system status monitoring, metrics visualization,
 * and real-time alerts for the scraping system.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { configManager } from './config-manager.ts';
import { controller } from './controller.ts';

export interface DashboardStatus {
  timestamp: string;
  system: {
    status: string;
    version: string;
    uptime: number;
    environment: string;
  };
  scraping: {
    enabled: boolean;
    status: string;
    queue_size: number;
    active_jobs: number;
    last_completed: string | null;
    next_scheduled: string | null;
    success_rate: number;
  };
  costs: {
    daily: number;
    weekly: number;
    monthly: number;
    limit: number;
    utilization: number;
    projected_monthly: number;
  };
  claude: {
    enabled: boolean;
    model: string;
    requests_today: number;
    average_confidence: number;
    token_usage: {
      input: number;
      output: number;
      total: number;
    };
  };
  performance: {
    avg_response_time: number;
    throughput_per_hour: number;
    error_rate: number;
    uptime_percentage: number;
  };
  alerts: Array<{
    level: 'info' | 'warning' | 'error' | 'critical';
    message: string;
    timestamp: string;
    component: string;
  }>;
  health: {
    database: 'healthy' | 'degraded' | 'down';
    workers: 'healthy' | 'degraded' | 'down';
    apis: 'healthy' | 'degraded' | 'down';
    overall: 'healthy' | 'degraded' | 'down';
  };
}

export interface RecentActivity {
  timestamp: string;
  type: 'batch_started' | 'batch_completed' | 'config_changed' | 'error' | 'alert';
  message: string;
  details?: Record<string, unknown>;
}

// Define interfaces
interface SystemEvent {
  created_at: string;
  event_type: string;
  event_data: Record<string, unknown>;
}

interface BatchJob {
  end_time?: string;
  start_time?: string;
  status?: string;
  processed_count?: number;
}

interface ScrapeLog {
  status?: string;
  confidence_score?: number;
  response_time_ms?: number;
  created_at?: string;
}

export class Dashboard {
  private static instance: Dashboard;
  private supabase?: SupabaseClient;
  private startTime: Date;

  private constructor() {
    this.startTime = new Date();
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
    const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    if (SUPABASE_URL && SUPABASE_KEY) {
      this.supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    }
  }

  static getInstance(): Dashboard {
    if (!Dashboard.instance) {
      Dashboard.instance = new Dashboard();
    }
    return Dashboard.instance;
  }

  /**
   * Get comprehensive system status for dashboard
   */
  async getSystemStatus(): Promise<Response> {
    try {
      const [
        systemInfo,
        scrapingStatus,
        costMetrics,
        claudeUsage,
        performanceMetrics,
        alerts,
        healthCheck
      ] = await Promise.all([
        this.getSystemInfo(),
        this.getScrapingStatus(),
        this.getCostMetrics(),
        this.getClaudeUsage(),
        this.getPerformanceMetrics(),
        this.getActiveAlerts(),
        this.performHealthCheck()
      ]);

      const dashboardStatus: DashboardStatus = {
        timestamp: new Date().toISOString(),
        system: systemInfo,
        scraping: scrapingStatus,
        costs: costMetrics,
        claude: claudeUsage,
        performance: performanceMetrics,
        alerts: alerts,
        health: healthCheck
      };

      return new Response(JSON.stringify(dashboardStatus, null, 2), {
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });

    } catch (error) {
      console.error('Error getting system status:', error);
      return new Response(JSON.stringify({
        error: 'Failed to retrieve system status',
        message: String(error),
        timestamp: new Date().toISOString()
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * Get recent system activity
   */
  async getRecentActivity(limit: number = 20): Promise<Response> {
    try {
      const activities: RecentActivity[] = [];

      if (this.supabase) {
        // Get recent system events
        const { data: events, error } = await this.supabase
          .from('system_events')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(limit);

        if (!error && events) {
          activities.push(...events.map((event: SystemEvent) => ({
            timestamp: event.created_at,
            type: this.mapEventTypeToActivityType(event.event_type),
            message: this.formatEventMessage(event.event_type, event.event_data),
            details: event.event_data
          })));
        }

        // Get recent batch completions
        const { data: batches } = await this.supabase
          .from('batch_jobs')
          .select('*')
          .order('end_time', { ascending: false })
          .limit(10);

        if (batches) {
          activities.push(...batches
            .filter((batch: BatchJob) => batch.end_time)
            .map((batch: BatchJob) => ({
              timestamp: batch.end_time!,
              type: batch.status === 'completed' ? 'batch_completed' as const : 'error' as const,
              message: `Batch ${batch.processed_count} properties processed`,
              details: batch
            })));
        }
      }

      // Sort by timestamp and limit
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      return new Response(JSON.stringify({
        activities: activities.slice(0, limit),
        total: activities.length
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Error getting recent activity:', error);
      return new Response(JSON.stringify({
        error: 'Failed to retrieve recent activity',
        message: String(error)
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * Get system metrics for charts/graphs
   */
  async getMetricsData(timeRange: '1h' | '24h' | '7d' | '30d' = '24h'): Promise<Response> {
    try {
      const endTime = new Date();
      let startTime: Date;
      let interval: string;

      switch (timeRange) {
        case '1h':
          startTime = new Date(endTime.getTime() - 60 * 60 * 1000);
          interval = '5 minutes';
          break;
        case '24h':
          startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000);
          interval = '1 hour';
          break;
        case '7d':
          startTime = new Date(endTime.getTime() - 7 * 24 * 60 * 60 * 1000);
          interval = '6 hours';
          break;
        case '30d':
          startTime = new Date(endTime.getTime() - 30 * 24 * 60 * 60 * 1000);
          interval = '1 day';
          break;
      }

      const [
        costData,
        throughputData,
        errorData,
        queueData
      ] = await Promise.all([
        this.getCostTrendData(startTime, endTime, interval),
        this.getThroughputTrendData(startTime, endTime, interval),
        this.getErrorTrendData(startTime, endTime, interval),
        this.getQueueTrendData(startTime, endTime, interval)
      ]);

      return new Response(JSON.stringify({
        timeRange,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        interval,
        metrics: {
          costs: costData,
          throughput: throughputData,
          errors: errorData,
          queue: queueData
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Error getting metrics data:', error);
      return new Response(JSON.stringify({
        error: 'Failed to retrieve metrics data',
        message: String(error)
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  // Private helper methods

  private getSystemInfo(): DashboardStatus['system'] {
    const uptime = Math.floor((Date.now() - this.startTime.getTime()) / 1000);
    const environment = Deno.env.get('ENVIRONMENT') || 'development';

    return {
      status: '🟢 RUNNING',
      version: '1.0.0',
      uptime,
      environment
    };
  }

  private async getScrapingStatus(): Promise<DashboardStatus['scraping']> {
    const config = configManager.getConfig();
    const systemStatus = await controller.getSystemStatus();

    let successRate = 0;
    if (this.supabase) {
      try {
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data: logs } = await this.supabase
          .from('scraping_logs')
          .select('status')
          .gte('created_at', yesterday);

        if (logs && logs.length > 0) {
          const successful = logs.filter((log: ScrapeLog) => log.status === 'success').length;
          successRate = successful / logs.length;
        }
      } catch (error) {
        console.error('Error calculating success rate:', error);
      }
    }

    return {
      enabled: config.scrapingEnabled,
      status: systemStatus.scraping.status,
      queue_size: systemStatus.queue.pending,
      active_jobs: systemStatus.queue.processing,
      last_completed: systemStatus.scraping.lastRun || null,
      next_scheduled: systemStatus.scraping.nextScheduled || null,
      success_rate: successRate
    };
  }

  private async getCostMetrics(): Promise<DashboardStatus['costs']> {
    const config = configManager.getConfig();
    const costStatus = await controller.getSystemStatus().then(s => s.costs);

    const utilization = costStatus.today / config.dailyCostLimit;
    const projectedMonthly = costStatus.today * 30; // Simple projection

    return {
      daily: costStatus.today,
      weekly: costStatus.thisWeek,
      monthly: costStatus.thisMonth,
      limit: config.dailyCostLimit,
      utilization,
      projected_monthly: projectedMonthly
    };
  }

  private async getClaudeUsage(): Promise<DashboardStatus['claude']> {
    const config = configManager.getConfig();
    let requestsToday = 0;
    let averageConfidence = 0;
    const tokenUsage = { input: 0, output: 0, total: 0 };

    if (this.supabase) {
      try {
        const today = new Date().toISOString().slice(0, 10);
        
        // Get today's AI requests
        const { data: costs } = await this.supabase
          .from('scraping_costs')
          .select('ai_requests, tokens_used, details')
          .eq('date', today)
          .single();

        if (costs) {
          requestsToday = costs.ai_requests || 0;
          tokenUsage.total = costs.tokens_used || 0;
          
          if (costs.details && costs.details.input_tokens) {
            tokenUsage.input = costs.details.input_tokens;
            tokenUsage.output = costs.details.output_tokens || 0;
          }
        }

        // Calculate average confidence from recent successful extractions
        const { data: recentLogs } = await this.supabase
          .from('scraping_logs')
          .select('confidence_score')
          .eq('status', 'success')
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .limit(100);

        if (recentLogs && recentLogs.length > 0) {
          const validScores = recentLogs
            .filter((log: ScrapeLog) => log.confidence_score != null)
            .map((log: ScrapeLog) => log.confidence_score!);
          
          if (validScores.length > 0) {
            averageConfidence = validScores.reduce((sum: number, score: number) => sum + score, 0) / validScores.length;
          }
        }

      } catch (error) {
        console.error('Error getting Claude usage:', error);
      }
    }

    return {
      enabled: config.claudeEnabled,
      model: config.claudeModel,
      requests_today: requestsToday,
      average_confidence: averageConfidence,
      token_usage: tokenUsage
    };
  }

  private async getPerformanceMetrics(): Promise<DashboardStatus['performance']> {
    let avgResponseTime = 0;
    let throughputPerHour = 0;
    let errorRate = 0;
    let uptimePercentage = 100;

    if (this.supabase) {
      try {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

        // Get recent performance data
        const { data: recentLogs } = await this.supabase
          .from('scraping_logs')
          .select('response_time_ms, status, created_at')
          .gte('created_at', oneDayAgo);

        if (recentLogs && recentLogs.length > 0) {
          // Calculate average response time
          const responseTimes = recentLogs
            .filter((log: ScrapeLog) => log.response_time_ms != null)
            .map((log: ScrapeLog) => log.response_time_ms!);
          
          if (responseTimes.length > 0) {
            avgResponseTime = responseTimes.reduce((sum: number, time: number) => sum + time, 0) / responseTimes.length;
          }

          // Calculate hourly throughput
          const recentHour = recentLogs.filter((log: ScrapeLog) => log.created_at && log.created_at >= oneHourAgo);
          throughputPerHour = recentHour.length;

          // Calculate error rate
          const errors = recentLogs.filter((log: ScrapeLog) => log.status === 'error').length;
          errorRate = errors / recentLogs.length;
        }

        // Calculate uptime (simplified - based on successful health checks)
        const { data: healthLogs } = await this.supabase
          .from('system_events')
          .select('event_type')
          .eq('event_type', 'health_check')
          .gte('created_at', oneDayAgo);

        if (healthLogs && healthLogs.length > 0) {
          // Simplified uptime calculation
          uptimePercentage = Math.min(100, (healthLogs.length / 24) * 100);
        }

      } catch (error) {
        console.error('Error getting performance metrics:', error);
      }
    }

    return {
      avg_response_time: avgResponseTime,
      throughput_per_hour: throughputPerHour,
      error_rate: errorRate,
      uptime_percentage: uptimePercentage
    };
  }

  private async getActiveAlerts(): Promise<DashboardStatus['alerts']> {
    const alerts: DashboardStatus['alerts'] = [];
    const config = configManager.getConfig();

    // Check operational limits
    const limits = await configManager.checkOperationalLimits();
    
    // Add violations as critical alerts
    limits.violations.forEach(violation => {
      alerts.push({
        level: 'critical',
        message: violation,
        timestamp: new Date().toISOString(),
        component: 'system'
      });
    });

    // Add warnings as warning alerts
    limits.warnings.forEach(warning => {
      alerts.push({
        level: 'warning',
        message: warning,
        timestamp: new Date().toISOString(),
        component: 'system'
      });
    });

    // Check for system-specific alerts
    if (!config.scrapingEnabled) {
      alerts.push({
        level: 'info',
        message: 'Scraping system is currently disabled',
        timestamp: new Date().toISOString(),
        component: 'scraper'
      });
    }

    if (!config.claudeEnabled) {
      alerts.push({
        level: 'warning',
        message: 'Claude AI processing is disabled',
        timestamp: new Date().toISOString(),
        component: 'claude'
      });
    }

    return alerts.sort((a, b) => {
      const levelOrder = { critical: 0, error: 1, warning: 2, info: 3 };
      return levelOrder[a.level] - levelOrder[b.level];
    });
  }

  private async performHealthCheck(): Promise<DashboardStatus['health']> {
    const health: DashboardStatus['health'] = {
      database: 'healthy',
      workers: 'healthy',
      apis: 'healthy',
      overall: 'healthy'
    };

    // Check database health
    if (this.supabase) {
      try {
        const { error } = await this.supabase
          .from('system_config')
          .select('config_key')
          .limit(1);
        
        if (error) {
          health.database = 'degraded';
        }
      } catch {
        health.database = 'down';
      }
    } else {
      health.database = 'down';
    }

    // Check worker health
    const systemStatus = await controller.getSystemStatus();
    if (systemStatus.workers.healthy < systemStatus.workers.total) {
      health.workers = systemStatus.workers.healthy === 0 ? 'down' : 'degraded';
    }

    // Check Claude API health
    if (configManager.getConfig().claudeEnabled) {
      try {
        const testResponse = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': Deno.env.get('ANTHROPIC_API_KEY') || '',
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-3-haiku-20240307',
            max_tokens: 1,
            messages: [{ role: 'user', content: 'test' }]
          })
        });

        if (!testResponse.ok && testResponse.status !== 401) { // 401 is expected for invalid key
          health.apis = 'degraded';
        }
      } catch {
        health.apis = 'down';
      }
    }

    // Determine overall health
    const healthValues = Object.values(health).filter(h => h !== 'healthy');
    if (healthValues.includes('down')) {
      health.overall = 'down';
    } else if (healthValues.includes('degraded')) {
      health.overall = 'degraded';
    }

    return health;
  }

  private formatEventMessage(eventType: string, eventData: Record<string, unknown>): string {
    switch (eventType) {
      case 'scraping_enabled':
        return 'Scraping system enabled';
      case 'scraping_disabled':
        return 'Scraping system disabled';
      case 'batch_started':
        return `Batch processing started (${eventData.batch_size} properties)`;
      case 'config_updated':
        return 'System configuration updated';
      case 'emergency_stop':
        return 'Emergency stop activated';
      default:
        return `System event: ${eventType}`;
    }
  }

  private mapEventTypeToActivityType(eventType: string): RecentActivity['type'] {
    switch (eventType) {
      case 'scraping_enabled':
      case 'scraping_disabled':
      case 'config_updated':
        return 'config_changed';
      case 'batch_started':
        return 'batch_started';
      case 'emergency_stop':
        return 'error';
      default:
        return 'alert';
    }
  }

  private getCostTrendData(_startTime: Date, _endTime: Date, _interval: string): Array<{timestamp: string, value: number}> {
    // Implementation would depend on your specific database schema and requirements
    // This is a placeholder that returns sample data
    return [];
  }

  private getThroughputTrendData(_startTime: Date, _endTime: Date, _interval: string): Array<{timestamp: string, value: number}> {
    // Implementation would depend on your specific database schema and requirements
    return [];
  }

  private getErrorTrendData(_startTime: Date, _endTime: Date, _interval: string): Array<{timestamp: string, value: number}> {
    // Implementation would depend on your specific database schema and requirements
    return [];
  }

  private getQueueTrendData(_startTime: Date, _endTime: Date, _interval: string): Array<{timestamp: string, value: number}> {
    // Implementation would depend on your specific database schema and requirements
    return [];
  }
}

// Export singleton instance
export const dashboard = Dashboard.getInstance();