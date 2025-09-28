/**
 * Configuration Manager for Real Estate Scraper Command Station
 * 
 * Handles system configuration, settings persistence, and configuration broadcasting
 * to all worker functions and services.
 */

import { createClient } from '@supabase/supabase-js';

export interface SystemConfig {
  scrapingEnabled: boolean;
  claudeEnabled: boolean;
  batchSize: number;
  dailyCostLimit: number;
  schedule: string; // Cron expression
  maxConcurrentJobs: number;
  enableCostTracking: boolean;
  claudeModel: string;
  retryAttempts: number;
  timeoutMs: number;
  alertThresholds: {
    dailyCost: number;
    errorRate: number;
    queueSize: number;
  };
  features: {
    autoRetry: boolean;
    smartBatching: boolean;
    costOptimization: boolean;
    realTimeMonitoring: boolean;
  };
}

export class ConfigManager {
  private static instance: ConfigManager;
  private config: SystemConfig;
  private supabase: any;

  private constructor() {
    // Default configuration
    this.config = {
      scrapingEnabled: true,
      claudeEnabled: true,
      batchSize: 50,
      dailyCostLimit: 50,
      schedule: '0 0 * * 0', // Weekly Sunday at midnight
      maxConcurrentJobs: 5,
      enableCostTracking: true,
      claudeModel: 'claude-3-haiku-20240307',
      retryAttempts: 3,
      timeoutMs: 30000,
      alertThresholds: {
        dailyCost: 40, // Alert at 80% of daily limit
        errorRate: 0.15, // Alert if error rate > 15%
        queueSize: 100 // Alert if queue size > 100
      },
      features: {
        autoRetry: true,
        smartBatching: true,
        costOptimization: true,
        realTimeMonitoring: true
      }
    };

    // Initialize Supabase client
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
    const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    if (SUPABASE_URL && SUPABASE_KEY) {
      this.supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    }
  }

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  /**
   * Get current system configuration
   */
  getConfig(): SystemConfig {
    return { ...this.config };
  }

  /**
   * Update system configuration
   */
  async updateConfig(updates: Partial<SystemConfig>): Promise<void> {
    // Validate configuration updates
    this.validateConfig(updates);

    // Merge with existing config
    this.config = { ...this.config, ...updates };

    // Persist to database
    await this.saveConfig();

    // Broadcast to all workers
    await this.broadcastConfigUpdate();
  }

  /**
   * Load configuration from database
   */
  async loadConfig(): Promise<void> {
    if (!this.supabase) return;

    try {
      const { data, error } = await this.supabase
        .from('system_config')
        .select('*')
        .eq('config_key', 'scraper_system')
        .single();

      if (data && !error) {
        const storedConfig = data.config_value as Partial<SystemConfig>;
        this.config = { ...this.config, ...storedConfig };
      }
    } catch (error) {
      console.warn('Failed to load config from database:', error);
      // Continue with default config
    }
  }

  /**
   * Save configuration to database
   */
  private async saveConfig(): Promise<void> {
    if (!this.supabase) return;

    try {
      const { error } = await this.supabase
        .from('system_config')
        .upsert({
          config_key: 'scraper_system',
          config_value: this.config,
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Failed to save config:', error);
      }
    } catch (error) {
      console.error('Error saving config:', error);
    }
  }

  /**
   * Broadcast configuration updates to all workers
   */
  private async broadcastConfigUpdate(): Promise<void> {
    if (!this.supabase) return;

    const workers = [
      'ai-scraper-worker',
      'scraper-orchestrator',
      'scraper-worker'
    ];

    // Send config update to each worker
    for (const worker of workers) {
      try {
        const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/${worker}/config`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'update_config',
            config: this.config
          })
        });

        if (!response.ok) {
          console.warn(`Failed to update config for ${worker}:`, response.status);
        }
      } catch (error) {
        console.warn(`Error broadcasting config to ${worker}:`, error);
      }
    }

    // Also broadcast via database pub/sub if available
    try {
      await this.supabase
        .from('system_events')
        .insert({
          event_type: 'config_update',
          event_data: this.config,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.warn('Failed to broadcast config via pub/sub:', error);
    }
  }

  /**
   * Validate configuration updates
   */
  private validateConfig(updates: Partial<SystemConfig>): void {
    if (updates.batchSize !== undefined) {
      if (updates.batchSize < 1 || updates.batchSize > 500) {
        throw new Error('Batch size must be between 1 and 500');
      }
    }

    if (updates.dailyCostLimit !== undefined) {
      if (updates.dailyCostLimit < 0 || updates.dailyCostLimit > 1000) {
        throw new Error('Daily cost limit must be between $0 and $1000');
      }
    }

    if (updates.maxConcurrentJobs !== undefined) {
      if (updates.maxConcurrentJobs < 1 || updates.maxConcurrentJobs > 20) {
        throw new Error('Max concurrent jobs must be between 1 and 20');
      }
    }

    if (updates.schedule !== undefined) {
      // Basic cron validation - could be enhanced
      const cronPattern = /^(\*|[0-5]?[0-9]) (\*|[0-1]?[0-9]|2[0-3]) (\*|[0-2]?[0-9]|3[0-1]) (\*|[0-1]?[0-2]) (\*|[0-6])$/;
      if (!cronPattern.test(updates.schedule)) {
        throw new Error('Invalid cron schedule format');
      }
    }

    if (updates.claudeModel !== undefined) {
      const validModels = [
        'claude-3-haiku-20240307',
        'claude-3-sonnet-20240229',
        'claude-3-opus-20240229'
      ];
      if (!validModels.includes(updates.claudeModel)) {
        throw new Error(`Invalid Claude model. Must be one of: ${validModels.join(', ')}`);
      }
    }
  }

  /**
   * Get configuration for specific service
   */
  getServiceConfig(service: 'scraper' | 'claude' | 'orchestrator'): Partial<SystemConfig> {
    switch (service) {
      case 'scraper':
        return {
          scrapingEnabled: this.config.scrapingEnabled,
          batchSize: this.config.batchSize,
          maxConcurrentJobs: this.config.maxConcurrentJobs,
          retryAttempts: this.config.retryAttempts,
          timeoutMs: this.config.timeoutMs
        };
      
      case 'claude':
        return {
          claudeEnabled: this.config.claudeEnabled,
          claudeModel: this.config.claudeModel,
          enableCostTracking: this.config.enableCostTracking,
          dailyCostLimit: this.config.dailyCostLimit
        };
      
      case 'orchestrator':
        return {
          scrapingEnabled: this.config.scrapingEnabled,
          schedule: this.config.schedule,
          batchSize: this.config.batchSize,
          maxConcurrentJobs: this.config.maxConcurrentJobs
        };
      
      default:
        return this.config;
    }
  }

  /**
   * Calculate next scheduled run time
   */
  calculateNextRun(): string {
    // Simple implementation - would use a proper cron parser in production
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    nextWeek.setHours(0, 0, 0, 0);
    return nextWeek.toISOString();
  }

  /**
   * Check if system is within operational limits
   */
  async checkOperationalLimits(): Promise<{
    withinLimits: boolean;
    violations: string[];
    warnings: string[];
  }> {
    const violations: string[] = [];
    const warnings: string[] = [];

    if (!this.supabase) {
      return { withinLimits: true, violations, warnings };
    }

    try {
      // Check daily cost limit
      const today = new Date().toISOString().slice(0, 10);
      const { data: costData } = await this.supabase
        .from('scraping_costs')
        .select('estimated_cost')
        .eq('date', today)
        .single();

      const dailyCost = costData?.estimated_cost || 0;
      if (dailyCost >= this.config.dailyCostLimit) {
        violations.push(`Daily cost limit exceeded: $${dailyCost.toFixed(2)} >= $${this.config.dailyCostLimit}`);
      } else if (dailyCost >= this.config.alertThresholds.dailyCost) {
        warnings.push(`Daily cost approaching limit: $${dailyCost.toFixed(2)} (${(dailyCost / this.config.dailyCostLimit * 100).toFixed(1)}%)`);
      }

      // Check queue size
      const { count: queueSize } = await this.supabase
        .from('scraping_queue')
        .select('*', { count: 'exact' })
        .eq('status', 'pending');

      if (queueSize && queueSize >= this.config.alertThresholds.queueSize) {
        warnings.push(`Large queue size detected: ${queueSize} pending jobs`);
      }

      // Check error rate (last 24 hours)
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: errorData } = await this.supabase
        .from('scraping_logs')
        .select('status')
        .gte('created_at', yesterday);

      if (errorData && errorData.length > 0) {
        const errorCount = errorData.filter(log => log.status === 'error').length;
        const errorRate = errorCount / errorData.length;
        
        if (errorRate >= this.config.alertThresholds.errorRate) {
          warnings.push(`High error rate detected: ${(errorRate * 100).toFixed(1)}% (${errorCount}/${errorData.length})`);
        }
      }

    } catch (error) {
      console.error('Error checking operational limits:', error);
      warnings.push('Unable to verify all operational limits');
    }

    return {
      withinLimits: violations.length === 0,
      violations,
      warnings
    };
  }

  /**
   * Export configuration for backup/audit
   */
  exportConfig(): string {
    return JSON.stringify({
      exportDate: new Date().toISOString(),
      version: '1.0.0',
      config: this.config
    }, null, 2);
  }

  /**
   * Import configuration from backup
   */
  async importConfig(configJson: string): Promise<void> {
    try {
      const importData = JSON.parse(configJson);
      if (importData.config) {
        await this.updateConfig(importData.config);
      } else {
        throw new Error('Invalid configuration format');
      }
    } catch (error) {
      throw new Error(`Failed to import configuration: ${error}`);
    }
  }
}

// Export singleton instance
export const configManager = ConfigManager.getInstance();