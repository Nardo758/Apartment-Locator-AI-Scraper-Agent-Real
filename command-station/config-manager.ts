// command-station/config-manager.ts
export interface SystemConfig {
  scrapingEnabled: boolean
  claudeEnabled: boolean
  batchSize: number
  dailyCostLimit: number
  schedule: string
  maxRetries: number
  timeoutMs: number
  alertThresholds: {
    errorRate: number
    responseTime: number
    costLimit: number
    memoryUsage: number
  }
  integrations: {
    supabase: {
      enabled: boolean
      url?: string
    }
    claude: {
      enabled: boolean
      model: string
      maxTokens: number
    }
    monitoring: {
      enabled: boolean
      alertWebhook?: string
    }
  }
}

export class ConfigManager {
  private static readonly CONFIG_KEY = 'command_station_config'
  private static readonly DEFAULT_CONFIG: SystemConfig = {
    scrapingEnabled: true,
    claudeEnabled: true,
    batchSize: 50,
    dailyCostLimit: 50,
    schedule: '0 0 * * 0', // Weekly Sunday
    maxRetries: 3,
    timeoutMs: 30000,
    alertThresholds: {
      errorRate: 0.05, // 5%
      responseTime: 5000, // 5 seconds
      costLimit: 45, // $45 (90% of daily limit)
      memoryUsage: 0.8 // 80%
    },
    integrations: {
      supabase: {
        enabled: true,
        url: Deno.env.get('SUPABASE_URL')
      },
      claude: {
        enabled: true,
        model: 'claude-3-haiku-20240307',
        maxTokens: 4096
      },
      monitoring: {
        enabled: false,
        alertWebhook: undefined
      }
    }
  }

  static async getConfig(): Promise<SystemConfig> {
    try {
      // Try to load from Supabase first
      const supabaseConfig = await this.loadFromSupabase()
      if (supabaseConfig) {
        return { ...this.DEFAULT_CONFIG, ...supabaseConfig }
      }

      // Fallback to local storage or environment variables
      const localConfig = await this.loadFromLocal()
      return { ...this.DEFAULT_CONFIG, ...localConfig }
    } catch (error) {
      console.error('Failed to load config, using defaults:', error)
      return this.DEFAULT_CONFIG
    }
  }

  static async saveConfig(config: Partial<SystemConfig>): Promise<void> {
    try {
      const currentConfig = await this.getConfig()
      const updatedConfig = { ...currentConfig, ...config }
      
      // Validate the config before saving
      this.validateConfig(updatedConfig)
      
      // Save to Supabase
      await this.saveToSupabase(updatedConfig)
      
      // Also save locally as backup
      await this.saveToLocal(updatedConfig)
      
      console.log('Configuration saved successfully')
    } catch (error) {
      console.error('Failed to save config:', error)
      throw new Error(`Configuration save failed: ${error.message}`)
    }
  }

  static async resetToDefaults(): Promise<void> {
    try {
      await this.saveConfig(this.DEFAULT_CONFIG)
      console.log('Configuration reset to defaults')
    } catch (error) {
      console.error('Failed to reset config:', error)
      throw error
    }
  }

  static async exportConfig(): Promise<string> {
    try {
      const config = await this.getConfig()
      return JSON.stringify(config, null, 2)
    } catch (error) {
      console.error('Failed to export config:', error)
      throw error
    }
  }

  static async importConfig(configJson: string): Promise<void> {
    try {
      const config = JSON.parse(configJson)
      this.validateConfig(config)
      await this.saveConfig(config)
      console.log('Configuration imported successfully')
    } catch (error) {
      console.error('Failed to import config:', error)
      throw new Error(`Configuration import failed: ${error.message}`)
    }
  }

  private static async loadFromSupabase(): Promise<Partial<SystemConfig> | null> {
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
      
      if (!supabaseUrl || !supabaseKey) {
        return null
      }

      const response = await fetch(`${supabaseUrl}/rest/v1/system_config?key=eq.${this.CONFIG_KEY}`, {
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        return null
      }

      const data = await response.json()
      if (data && data.length > 0) {
        return data[0].config
      }

      return null
    } catch (error) {
      console.error('Failed to load config from Supabase:', error)
      return null
    }
  }

  private static async saveToSupabase(config: SystemConfig): Promise<void> {
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
      
      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase credentials not configured')
      }

      // First try to update existing config
      const updateResponse = await fetch(`${supabaseUrl}/rest/v1/system_config?key=eq.${this.CONFIG_KEY}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          config,
          updated_at: new Date().toISOString()
        })
      })

      // If update didn't affect any rows, insert new config
      if (updateResponse.ok) {
        const updateResult = updateResponse.headers.get('content-range')
        if (updateResult && updateResult.includes('0-*/*')) {
          // No rows updated, insert new config
          await fetch(`${supabaseUrl}/rest/v1/system_config`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseKey}`,
              'apikey': supabaseKey,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              key: this.CONFIG_KEY,
              config,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
          })
        }
      }
    } catch (error) {
      console.error('Failed to save config to Supabase:', error)
      throw error
    }
  }

  private static async loadFromLocal(): Promise<Partial<SystemConfig>> {
    try {
      // Try to load from environment variables
      const config: Partial<SystemConfig> = {}
      
      if (Deno.env.get('SCRAPING_ENABLED') !== undefined) {
        config.scrapingEnabled = Deno.env.get('SCRAPING_ENABLED') === 'true'
      }
      
      if (Deno.env.get('CLAUDE_ENABLED') !== undefined) {
        config.claudeEnabled = Deno.env.get('CLAUDE_ENABLED') === 'true'
      }
      
      if (Deno.env.get('BATCH_SIZE')) {
        config.batchSize = parseInt(Deno.env.get('BATCH_SIZE')!, 10)
      }
      
      if (Deno.env.get('DAILY_COST_LIMIT')) {
        config.dailyCostLimit = parseFloat(Deno.env.get('DAILY_COST_LIMIT')!)
      }
      
      if (Deno.env.get('SCRAPE_SCHEDULE')) {
        config.schedule = Deno.env.get('SCRAPE_SCHEDULE')!
      }

      return config
    } catch (error) {
      console.error('Failed to load local config:', error)
      return {}
    }
  }

  private static async saveToLocal(config: SystemConfig): Promise<void> {
    try {
      // In a real implementation, you might want to save to a local file
      // For now, we'll just log that local save was attempted
      console.log('Local config save attempted (not implemented in this example)')
    } catch (error) {
      console.error('Failed to save local config:', error)
    }
  }

  private static validateConfig(config: any): void {
    const errors: string[] = []
    
    // Required fields
    if (typeof config.scrapingEnabled !== 'boolean') {
      errors.push('scrapingEnabled must be a boolean')
    }
    
    if (typeof config.claudeEnabled !== 'boolean') {
      errors.push('claudeEnabled must be a boolean')
    }
    
    if (typeof config.batchSize !== 'number' || config.batchSize <= 0 || config.batchSize > 1000) {
      errors.push('batchSize must be a number between 1 and 1000')
    }
    
    if (typeof config.dailyCostLimit !== 'number' || config.dailyCostLimit <= 0) {
      errors.push('dailyCostLimit must be a positive number')
    }
    
    if (typeof config.schedule !== 'string') {
      errors.push('schedule must be a valid cron string')
    }
    
    if (typeof config.maxRetries !== 'number' || config.maxRetries < 0) {
      errors.push('maxRetries must be a non-negative number')
    }
    
    if (typeof config.timeoutMs !== 'number' || config.timeoutMs <= 0) {
      errors.push('timeoutMs must be a positive number')
    }
    
    // Validate alert thresholds
    if (config.alertThresholds) {
      const thresholds = config.alertThresholds
      
      if (typeof thresholds.errorRate !== 'number' || thresholds.errorRate < 0 || thresholds.errorRate > 1) {
        errors.push('alertThresholds.errorRate must be between 0 and 1')
      }
      
      if (typeof thresholds.responseTime !== 'number' || thresholds.responseTime <= 0) {
        errors.push('alertThresholds.responseTime must be a positive number')
      }
      
      if (typeof thresholds.costLimit !== 'number' || thresholds.costLimit <= 0) {
        errors.push('alertThresholds.costLimit must be a positive number')
      }
      
      if (typeof thresholds.memoryUsage !== 'number' || thresholds.memoryUsage < 0 || thresholds.memoryUsage > 1) {
        errors.push('alertThresholds.memoryUsage must be between 0 and 1')
      }
    }
    
    if (errors.length > 0) {
      throw new Error(`Configuration validation failed: ${errors.join(', ')}`)
    }
  }

  // Utility methods for specific config sections
  static async updateScrapingConfig(config: {
    enabled?: boolean
    batchSize?: number
    schedule?: string
  }): Promise<void> {
    const currentConfig = await this.getConfig()
    await this.saveConfig({
      ...currentConfig,
      scrapingEnabled: config.enabled ?? currentConfig.scrapingEnabled,
      batchSize: config.batchSize ?? currentConfig.batchSize,
      schedule: config.schedule ?? currentConfig.schedule
    })
  }

  static async updateClaudeConfig(config: {
    enabled?: boolean
    model?: string
    maxTokens?: number
  }): Promise<void> {
    const currentConfig = await this.getConfig()
    await this.saveConfig({
      ...currentConfig,
      claudeEnabled: config.enabled ?? currentConfig.claudeEnabled,
      integrations: {
        ...currentConfig.integrations,
        claude: {
          ...currentConfig.integrations.claude,
          model: config.model ?? currentConfig.integrations.claude.model,
          maxTokens: config.maxTokens ?? currentConfig.integrations.claude.maxTokens
        }
      }
    })
  }

  static async updateAlertThresholds(thresholds: Partial<SystemConfig['alertThresholds']>): Promise<void> {
    const currentConfig = await this.getConfig()
    await this.saveConfig({
      ...currentConfig,
      alertThresholds: {
        ...currentConfig.alertThresholds,
        ...thresholds
      }
    })
  }

  // Get specific config sections
  static async getScrapingConfig() {
    const config = await this.getConfig()
    return {
      enabled: config.scrapingEnabled,
      batchSize: config.batchSize,
      schedule: config.schedule,
      maxRetries: config.maxRetries,
      timeoutMs: config.timeoutMs
    }
  }

  static async getClaudeConfig() {
    const config = await this.getConfig()
    return {
      enabled: config.claudeEnabled,
      ...config.integrations.claude
    }
  }

  static async getCostConfig() {
    const config = await this.getConfig()
    return {
      dailyLimit: config.dailyCostLimit,
      alertThreshold: config.alertThresholds.costLimit
    }
  }
}