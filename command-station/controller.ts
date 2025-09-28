// command-station/controller.ts
import { ConfigManager } from './config-manager.ts'

export class Controller {
  private static config = {
    scrapingEnabled: true,
    claudeEnabled: true,
    batchSize: 50,
    dailyCostLimit: 50,
    schedule: '0 0 * * 0', // Weekly Sunday
    maxRetries: 3,
    timeoutMs: 30000
  }

  static async enableScraping(): Promise<Response> {
    this.config.scrapingEnabled = true
    await this.saveConfig()
    
    // Trigger immediate status update to all workers
    await this.broadcastConfigUpdate()
    
    return new Response(JSON.stringify({
      status: 'enabled',
      message: '🟢 Scraping system ENABLED',
      next_run: this.calculateNextRun(),
      timestamp: new Date().toISOString(),
      config: {
        batch_size: this.config.batchSize,
        claude_enabled: this.config.claudeEnabled,
        daily_limit: this.config.dailyCostLimit
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    })
  }

  static async disableScraping(): Promise<Response> {
    this.config.scrapingEnabled = false
    await this.saveConfig()
    await this.broadcastConfigUpdate()
    
    return new Response(JSON.stringify({
      status: 'disabled',
      message: '🔴 Scraping system DISABLED',
      paused_until: 'manual_restart',
      timestamp: new Date().toISOString(),
      reason: 'Manual disable via command station'
    }), {
      headers: { 'Content-Type': 'application/json' }
    })
  }

  static async runImmediateBatch(): Promise<Response> {
    if (!this.config.scrapingEnabled) {
      return new Response(JSON.stringify({
        error: 'Scraping is disabled. Enable first with /enable-scraping',
        status: 'rejected',
        timestamp: new Date().toISOString()
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    try {
      // Trigger immediate batch processing
      const results = await this.triggerBatchProcessing()
      
      return new Response(JSON.stringify({
        status: 'batch_started',
        message: '🚀 Immediate batch processing initiated',
        batch_id: results.batchId,
        batch_size: this.config.batchSize,
        estimated_duration: '5-10 minutes',
        monitor_url: '/command-station/metrics',
        timestamp: new Date().toISOString(),
        details: results
      }), {
        headers: { 'Content-Type': 'application/json' }
      })
    } catch (error) {
      return new Response(JSON.stringify({
        error: 'Failed to start batch processing',
        message: error.message,
        status: 'failed',
        timestamp: new Date().toISOString()
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }
  }

  static async updateConfig(newConfig: any): Promise<Response> {
    try {
      // Validate configuration
      const validatedConfig = this.validateConfig(newConfig)
      
      // Update internal config
      this.config = { ...this.config, ...validatedConfig }
      
      // Save to persistent storage
      await this.saveConfig()
      
      // Broadcast to all workers
      await this.broadcastConfigUpdate()
      
      return new Response(JSON.stringify({
        status: 'updated',
        message: '⚙️ Configuration updated successfully',
        config: this.config,
        timestamp: new Date().toISOString()
      }), {
        headers: { 'Content-Type': 'application/json' }
      })
    } catch (error) {
      return new Response(JSON.stringify({
        error: 'Configuration update failed',
        message: error.message,
        timestamp: new Date().toISOString()
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }
  }

  private static validateConfig(config: any): any {
    const validated: any = {}
    
    if (typeof config.scrapingEnabled === 'boolean') {
      validated.scrapingEnabled = config.scrapingEnabled
    }
    
    if (typeof config.claudeEnabled === 'boolean') {
      validated.claudeEnabled = config.claudeEnabled
    }
    
    if (typeof config.batchSize === 'number' && config.batchSize > 0 && config.batchSize <= 1000) {
      validated.batchSize = config.batchSize
    }
    
    if (typeof config.dailyCostLimit === 'number' && config.dailyCostLimit > 0) {
      validated.dailyCostLimit = config.dailyCostLimit
    }
    
    if (typeof config.schedule === 'string') {
      // Basic cron validation - you might want to use a proper cron parser
      validated.schedule = config.schedule
    }
    
    if (typeof config.maxRetries === 'number' && config.maxRetries >= 0) {
      validated.maxRetries = config.maxRetries
    }
    
    if (typeof config.timeoutMs === 'number' && config.timeoutMs > 0) {
      validated.timeoutMs = config.timeoutMs
    }
    
    return validated
  }

  private static async saveConfig(): Promise<void> {
    try {
      await ConfigManager.saveConfig(this.config)
    } catch (error) {
      console.error('Failed to save config:', error)
      throw new Error('Configuration save failed')
    }
  }

  private static async broadcastConfigUpdate(): Promise<void> {
    try {
      // Update all workers with new config
      const supabaseUrl = Deno.env.get('SUPABASE_URL')
      const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')
      
      if (!supabaseUrl || !supabaseKey) {
        console.warn('Supabase credentials not found, skipping config broadcast')
        return
      }

      await fetch(`${supabaseUrl}/functions/v1/ai-scraper-worker/config`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(this.config)
      })
    } catch (error) {
      console.error('Failed to broadcast config update:', error)
      // Don't throw here - config update should still succeed locally
    }
  }

  private static calculateNextRun(): string {
    // Simple next run calculation - you might want to use a proper cron parser
    const now = new Date()
    const nextSunday = new Date(now)
    nextSunday.setDate(now.getDate() + (7 - now.getDay()))
    nextSunday.setHours(0, 0, 0, 0)
    
    return nextSunday.toISOString()
  }

  private static async triggerBatchProcessing(): Promise<any> {
    const batchId = `batch_${Date.now()}`
    
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')
      const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')
      
      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase credentials not configured')
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/ai-scraper-worker/batch`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          batchId,
          batchSize: this.config.batchSize,
          immediate: true
        })
      })

      if (!response.ok) {
        throw new Error(`Batch trigger failed: ${response.statusText}`)
      }

      const result = await response.json()
      return {
        batchId,
        ...result
      }
    } catch (error) {
      console.error('Batch processing trigger failed:', error)
      throw error
    }
  }

  static getConfig() {
    return { ...this.config }
  }
}