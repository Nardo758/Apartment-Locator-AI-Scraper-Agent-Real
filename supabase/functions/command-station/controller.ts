/**
 * System Controller for Real Estate Scraper Command Station
 * 
 * Handles system-wide control operations including enabling/disabling scraping,
 * triggering immediate batches, and managing worker coordination.
 */

import { createClient } from '@supabase/supabase-js';
import { configManager, SystemConfig } from './config-manager.ts';

export interface BatchResult {
  batchId: string;
  status: 'started' | 'running' | 'completed' | 'failed';
  propertiesProcessed: number;
  estimatedDuration: string;
  startTime: string;
  endTime?: string;
  errors?: string[];
}

export interface SystemStatus {
  scraping: {
    enabled: boolean;
    status: 'running' | 'paused' | 'error' | 'idle';
    lastRun?: string;
    nextScheduled?: string;
  };
  queue: {
    pending: number;
    processing: number;
    failed: number;
  };
  workers: {
    active: number;
    healthy: number;
    total: number;
  };
  costs: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    limit: number;
  };
}

export class Controller {
  private static instance: Controller;
  private supabase: any;

  private constructor() {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
    const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    if (SUPABASE_URL && SUPABASE_KEY) {
      this.supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    }
  }

  static getInstance(): Controller {
    if (!Controller.instance) {
      Controller.instance = new Controller();
    }
    return Controller.instance;
  }

  /**
   * Enable the scraping system
   */
  async enableScraping(): Promise<Response> {
    try {
      // Check operational limits before enabling
      const limits = await configManager.checkOperationalLimits();
      if (!limits.withinLimits) {
        return new Response(JSON.stringify({
          status: 'error',
          message: 'Cannot enable scraping: operational limits exceeded',
          violations: limits.violations,
          warnings: limits.warnings
        }), { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Update configuration
      await configManager.updateConfig({ scrapingEnabled: true });

      // Log system event
      await this.logSystemEvent('scraping_enabled', {
        user: 'command_station',
        timestamp: new Date().toISOString()
      });

      // Get next scheduled run
      const nextRun = configManager.calculateNextRun();

      return new Response(JSON.stringify({
        status: 'enabled',
        message: '🟢 Scraping system ENABLED',
        next_run: nextRun,
        warnings: limits.warnings
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Error enabling scraping:', error);
      return new Response(JSON.stringify({
        status: 'error',
        message: `Failed to enable scraping: ${error}`
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * Disable the scraping system
   */
  async disableScraping(): Promise<Response> {
    try {
      // Update configuration
      await configManager.updateConfig({ scrapingEnabled: false });

      // Cancel any pending jobs
      const cancelledJobs = await this.cancelPendingJobs();

      // Log system event
      await this.logSystemEvent('scraping_disabled', {
        user: 'command_station',
        cancelled_jobs: cancelledJobs,
        timestamp: new Date().toISOString()
      });

      return new Response(JSON.stringify({
        status: 'disabled',
        message: '🔴 Scraping system DISABLED',
        paused_until: 'manual_restart',
        cancelled_jobs: cancelledJobs
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Error disabling scraping:', error);
      return new Response(JSON.stringify({
        status: 'error',
        message: `Failed to disable scraping: ${error}`
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * Trigger immediate batch processing
   */
  async runImmediateBatch(): Promise<Response> {
    try {
      const config = configManager.getConfig();
      
      if (!config.scrapingEnabled) {
        return new Response(JSON.stringify({
          error: 'Scraping is disabled. Enable first with /enable-scraping'
        }), { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Check operational limits
      const limits = await configManager.checkOperationalLimits();
      if (!limits.withinLimits) {
        return new Response(JSON.stringify({
          error: 'Cannot start batch: operational limits exceeded',
          violations: limits.violations
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Create batch job
      const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const batchResult = await this.createBatchJob(batchId, config.batchSize);

      // Log system event
      await this.logSystemEvent('batch_started', {
        batch_id: batchId,
        batch_size: config.batchSize,
        user: 'command_station',
        timestamp: new Date().toISOString()
      });

      return new Response(JSON.stringify({
        status: 'batch_started',
        batch_id: batchId,
        batch_size: config.batchSize,
        estimated_duration: this.estimateBatchDuration(config.batchSize),
        monitor_url: `/command-station/batch/${batchId}`,
        warnings: limits.warnings
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Error starting immediate batch:', error);
      return new Response(JSON.stringify({
        status: 'error',
        message: `Failed to start batch: ${error}`
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * Update system configuration
   */
  async updateConfig(updates: Partial<SystemConfig>): Promise<Response> {
    try {
      // Validate and update configuration
      await configManager.updateConfig(updates);

      // Log configuration change
      await this.logSystemEvent('config_updated', {
        updates,
        user: 'command_station',
        timestamp: new Date().toISOString()
      });

      return new Response(JSON.stringify({
        status: 'updated',
        message: '⚙️ Configuration updated successfully',
        config: configManager.getConfig()
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Error updating configuration:', error);
      return new Response(JSON.stringify({
        status: 'error',
        message: `Failed to update configuration: ${error}`
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * Get current system status
   */
  async getSystemStatus(): Promise<SystemStatus> {
    const config = configManager.getConfig();
    
    try {
      // Get queue status
      const queueStatus = await this.getQueueStatus();
      
      // Get worker status
      const workerStatus = await this.getWorkerStatus();
      
      // Get cost information
      const costStatus = await this.getCostStatus();
      
      // Determine overall scraping status
      let scrapingStatus: 'running' | 'paused' | 'error' | 'idle' = 'idle';
      if (!config.scrapingEnabled) {
        scrapingStatus = 'paused';
      } else if (queueStatus.processing > 0) {
        scrapingStatus = 'running';
      } else if (workerStatus.healthy < workerStatus.total) {
        scrapingStatus = 'error';
      }

      return {
        scraping: {
          enabled: config.scrapingEnabled,
          status: scrapingStatus,
          lastRun: await this.getLastRunTime(),
          nextScheduled: config.scrapingEnabled ? configManager.calculateNextRun() : undefined
        },
        queue: queueStatus,
        workers: workerStatus,
        costs: costStatus
      };

    } catch (error) {
      console.error('Error getting system status:', error);
      return {
        scraping: {
          enabled: config.scrapingEnabled,
          status: 'error'
        },
        queue: { pending: 0, processing: 0, failed: 0 },
        workers: { active: 0, healthy: 0, total: 0 },
        costs: { today: 0, thisWeek: 0, thisMonth: 0, limit: config.dailyCostLimit }
      };
    }
  }

  /**
   * Get batch status
   */
  async getBatchStatus(batchId: string): Promise<BatchResult | null> {
    if (!this.supabase) return null;

    try {
      const { data, error } = await this.supabase
        .from('batch_jobs')
        .select('*')
        .eq('batch_id', batchId)
        .single();

      if (error || !data) return null;

      return {
        batchId: data.batch_id,
        status: data.status,
        propertiesProcessed: data.properties_processed || 0,
        estimatedDuration: data.estimated_duration,
        startTime: data.start_time,
        endTime: data.end_time,
        errors: data.errors || []
      };

    } catch (error) {
      console.error('Error getting batch status:', error);
      return null;
    }
  }

  /**
   * Emergency stop - immediately halt all operations
   */
  async emergencyStop(): Promise<Response> {
    try {
      // Disable scraping
      await configManager.updateConfig({ scrapingEnabled: false });

      // Cancel all pending and running jobs
      const cancelled = await this.cancelAllJobs();

      // Log emergency stop
      await this.logSystemEvent('emergency_stop', {
        user: 'command_station',
        cancelled_jobs: cancelled,
        timestamp: new Date().toISOString()
      });

      return new Response(JSON.stringify({
        status: 'emergency_stopped',
        message: '🚨 EMERGENCY STOP - All operations halted',
        cancelled_jobs: cancelled
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Error during emergency stop:', error);
      return new Response(JSON.stringify({
        status: 'error',
        message: `Emergency stop failed: ${error}`
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  // Private helper methods

  private async getQueueStatus(): Promise<{ pending: number; processing: number; failed: number }> {
    if (!this.supabase) return { pending: 0, processing: 0, failed: 0 };

    try {
      const { data, error } = await this.supabase
        .from('scraping_queue')
        .select('status')
        .in('status', ['pending', 'processing', 'failed']);

      if (error) throw error;

      const counts = { pending: 0, processing: 0, failed: 0 };
      data?.forEach((item: any) => {
        counts[item.status as keyof typeof counts]++;
      });

      return counts;
    } catch (error) {
      console.error('Error getting queue status:', error);
      return { pending: 0, processing: 0, failed: 0 };
    }
  }

  private async getWorkerStatus(): Promise<{ active: number; healthy: number; total: number }> {
    // In a real implementation, this would check worker health endpoints
    // For now, we'll return static values based on known workers
    const workers = ['ai-scraper-worker', 'scraper-orchestrator', 'scraper-worker'];
    
    let healthy = 0;
    for (const worker of workers) {
      try {
        const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/${worker}/health`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
          }
        });
        if (response.ok) healthy++;
      } catch {
        // Worker not responding
      }
    }

    return {
      active: healthy,
      healthy: healthy,
      total: workers.length
    };
  }

  private async getCostStatus(): Promise<{ today: number; thisWeek: number; thisMonth: number; limit: number }> {
    if (!this.supabase) return { today: 0, thisWeek: 0, thisMonth: 0, limit: 0 };

    const config = configManager.getConfig();
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);

    try {
      const { data: todayData } = await this.supabase
        .from('scraping_costs')
        .select('estimated_cost')
        .eq('date', today)
        .single();

      const { data: weekData } = await this.supabase
        .from('scraping_costs')
        .select('estimated_cost')
        .gte('date', weekStart);

      const { data: monthData } = await this.supabase
        .from('scraping_costs')
        .select('estimated_cost')
        .gte('date', monthStart);

      return {
        today: todayData?.estimated_cost || 0,
        thisWeek: weekData?.reduce((sum: number, item: any) => sum + (item.estimated_cost || 0), 0) || 0,
        thisMonth: monthData?.reduce((sum: number, item: any) => sum + (item.estimated_cost || 0), 0) || 0,
        limit: config.dailyCostLimit
      };

    } catch (error) {
      console.error('Error getting cost status:', error);
      return { today: 0, thisWeek: 0, thisMonth: 0, limit: config.dailyCostLimit };
    }
  }

  private async getLastRunTime(): Promise<string | undefined> {
    if (!this.supabase) return undefined;

    try {
      const { data, error } = await this.supabase
        .from('batch_jobs')
        .select('end_time')
        .eq('status', 'completed')
        .order('end_time', { ascending: false })
        .limit(1)
        .single();

      return data?.end_time;
    } catch {
      return undefined;
    }
  }

  private async createBatchJob(batchId: string, batchSize: number): Promise<BatchResult> {
    if (!this.supabase) {
      throw new Error('Database not available');
    }

    const startTime = new Date().toISOString();
    const estimatedDuration = this.estimateBatchDuration(batchSize);

    // Create batch job record
    await this.supabase
      .from('batch_jobs')
      .insert({
        batch_id: batchId,
        status: 'started',
        batch_size: batchSize,
        start_time: startTime,
        estimated_duration: estimatedDuration,
        properties_processed: 0
      });

    // Trigger actual batch processing
    await this.triggerBatchProcessing(batchId, batchSize);

    return {
      batchId,
      status: 'started',
      propertiesProcessed: 0,
      estimatedDuration,
      startTime
    };
  }

  private async triggerBatchProcessing(batchId: string, batchSize: number): Promise<void> {
    // Call the scraper orchestrator to start batch processing
    try {
      const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/scraper-orchestrator`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'start_batch',
          batch_id: batchId,
          batch_size: batchSize
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to trigger batch processing: ${response.status}`);
      }
    } catch (error) {
      console.error('Error triggering batch processing:', error);
      // Update batch status to failed
      if (this.supabase) {
        await this.supabase
          .from('batch_jobs')
          .update({ status: 'failed', errors: [String(error)] })
          .eq('batch_id', batchId);
      }
      throw error;
    }
  }

  private estimateBatchDuration(batchSize: number): string {
    // Rough estimation: ~2 seconds per property
    const estimatedMinutes = Math.ceil((batchSize * 2) / 60);
    if (estimatedMinutes < 5) return '2-5 minutes';
    if (estimatedMinutes < 15) return '5-15 minutes';
    if (estimatedMinutes < 30) return '15-30 minutes';
    return '30+ minutes';
  }

  private async cancelPendingJobs(): Promise<number> {
    if (!this.supabase) return 0;

    try {
      const { data, error } = await this.supabase
        .from('scraping_queue')
        .update({ status: 'cancelled' })
        .eq('status', 'pending')
        .select('id');

      return data?.length || 0;
    } catch (error) {
      console.error('Error cancelling pending jobs:', error);
      return 0;
    }
  }

  private async cancelAllJobs(): Promise<number> {
    if (!this.supabase) return 0;

    try {
      const { data, error } = await this.supabase
        .from('scraping_queue')
        .update({ status: 'cancelled' })
        .in('status', ['pending', 'processing'])
        .select('id');

      return data?.length || 0;
    } catch (error) {
      console.error('Error cancelling all jobs:', error);
      return 0;
    }
  }

  private async logSystemEvent(eventType: string, eventData: any): Promise<void> {
    if (!this.supabase) return;

    try {
      await this.supabase
        .from('system_events')
        .insert({
          event_type: eventType,
          event_data: eventData,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error logging system event:', error);
    }
  }
}

// Export singleton instance
export const controller = Controller.getInstance();