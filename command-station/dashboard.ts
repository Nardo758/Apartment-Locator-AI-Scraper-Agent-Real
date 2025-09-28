// command-station/dashboard.ts
import { ConfigManager } from './config-manager.ts'

export class Dashboard {
  static async getSystemStatus(): Promise<Response> {
    try {
      const [
        queueStatus,
        costMetrics,
        claudeUsage,
        recentErrors,
        nextSchedule,
        systemHealth
      ] = await Promise.all([
        this.getQueueStatus(),
        this.getCostMetrics(),
        this.getClaudeUsage(),
        this.getRecentErrors(),
        this.getNextSchedule(),
        this.getSystemHealth()
      ])

      const config = await ConfigManager.getConfig()

      return new Response(JSON.stringify({
        timestamp: new Date().toISOString(),
        system: {
          status: config.scrapingEnabled ? '🟢 RUNNING' : '🔴 PAUSED',
          version: '1.0.0',
          uptime: this.getUptime(),
          health: systemHealth
        },
        scraping: {
          enabled: config.scrapingEnabled,
          queue_size: queueStatus.pending_jobs,
          last_completed: queueStatus.last_completed,
          next_scheduled: nextSchedule,
          batch_size: config.batchSize,
          success_rate: queueStatus.success_rate
        },
        costs: {
          daily: costMetrics.daily_cost,
          monthly: costMetrics.monthly_cost,
          claude_usage: claudeUsage.cost_today,
          limit: config.dailyCostLimit,
          remaining: Math.max(0, config.dailyCostLimit - costMetrics.daily_cost)
        },
        claude: {
          enabled: config.claudeEnabled,
          requests_today: claudeUsage.requests_today,
          average_confidence: claudeUsage.avg_confidence,
          error_rate: claudeUsage.error_rate
        },
        database: {
          properties_count: await this.getPropertiesCount(),
          recent_updates: await this.getRecentUpdates(),
          storage_size: await this.getStorageSize()
        },
        alerts: recentErrors.length > 0 ? recentErrors : [],
        performance: {
          avg_response_time: await this.getAvgResponseTime(),
          memory_usage: await this.getMemoryUsage(),
          cpu_usage: await this.getCpuUsage()
        }
      }), {
        headers: { 'Content-Type': 'application/json' }
      })
    } catch (error) {
      console.error('Dashboard error:', error)
      return new Response(JSON.stringify({
        error: 'Failed to get system status',
        message: error.message,
        timestamp: new Date().toISOString()
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }
  }

  private static async getQueueStatus(): Promise<any> {
    try {
      // In a real implementation, this would query your job queue
      const supabaseUrl = Deno.env.get('SUPABASE_URL')
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
      
      if (!supabaseUrl || !supabaseKey) {
        return {
          pending_jobs: 0,
          last_completed: null,
          success_rate: 0
        }
      }

      // Mock implementation - replace with actual Supabase queries
      return {
        pending_jobs: Math.floor(Math.random() * 100),
        last_completed: new Date(Date.now() - Math.random() * 3600000).toISOString(),
        success_rate: 0.95 + Math.random() * 0.05
      }
    } catch (error) {
      console.error('Queue status error:', error)
      return {
        pending_jobs: 0,
        last_completed: null,
        success_rate: 0
      }
    }
  }

  private static async getCostMetrics(): Promise<any> {
    try {
      // Mock implementation - replace with actual cost tracking
      const now = new Date()
      const dailyCost = Math.random() * 30 // Random cost between 0-30
      const monthlyCost = dailyCost * (now.getDate() + Math.random() * 5)
      
      return {
        daily_cost: Math.round(dailyCost * 100) / 100,
        monthly_cost: Math.round(monthlyCost * 100) / 100,
        currency: 'USD'
      }
    } catch (error) {
      console.error('Cost metrics error:', error)
      return {
        daily_cost: 0,
        monthly_cost: 0,
        currency: 'USD'
      }
    }
  }

  private static async getClaudeUsage(): Promise<any> {
    try {
      // Mock implementation - replace with actual Claude usage tracking
      return {
        requests_today: Math.floor(Math.random() * 500),
        avg_confidence: 0.85 + Math.random() * 0.1,
        error_rate: Math.random() * 0.05,
        cost_today: Math.random() * 15
      }
    } catch (error) {
      console.error('Claude usage error:', error)
      return {
        requests_today: 0,
        avg_confidence: 0,
        error_rate: 0,
        cost_today: 0
      }
    }
  }

  private static async getRecentErrors(): Promise<any[]> {
    try {
      // Mock implementation - replace with actual error tracking
      const errors = []
      const errorCount = Math.floor(Math.random() * 3)
      
      for (let i = 0; i < errorCount; i++) {
        errors.push({
          timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString(),
          level: ['warning', 'error'][Math.floor(Math.random() * 2)],
          message: ['Rate limit exceeded', 'Network timeout', 'Parse error'][Math.floor(Math.random() * 3)],
          component: ['scraper', 'claude', 'database'][Math.floor(Math.random() * 3)]
        })
      }
      
      return errors
    } catch (error) {
      console.error('Recent errors fetch error:', error)
      return []
    }
  }

  private static async getNextSchedule(): Promise<string> {
    try {
      const config = await ConfigManager.getConfig()
      // Simple implementation - replace with proper cron parsing
      const now = new Date()
      const nextRun = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // Next week
      return nextRun.toISOString()
    } catch (error) {
      console.error('Next schedule error:', error)
      return new Date(Date.now() + 86400000).toISOString() // Tomorrow
    }
  }

  private static async getSystemHealth(): Promise<string> {
    try {
      // Check various system components
      const checks = await Promise.all([
        this.checkDatabase(),
        this.checkClaudeAPI(),
        this.checkMemory(),
        this.checkDisk()
      ])
      
      const healthyChecks = checks.filter(check => check).length
      const totalChecks = checks.length
      
      if (healthyChecks === totalChecks) return '🟢 Healthy'
      if (healthyChecks >= totalChecks * 0.75) return '🟡 Degraded'
      return '🔴 Unhealthy'
    } catch (error) {
      console.error('System health check error:', error)
      return '⚠️ Unknown'
    }
  }

  private static async checkDatabase(): Promise<boolean> {
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
      
      if (!supabaseUrl || !supabaseKey) return false
      
      const response = await fetch(`${supabaseUrl}/rest/v1/properties?limit=1`, {
        headers: { 'Authorization': `Bearer ${supabaseKey}` }
      })
      
      return response.ok
    } catch {
      return false
    }
  }

  private static async checkClaudeAPI(): Promise<boolean> {
    try {
      const claudeKey = Deno.env.get('CLAUDE_API_KEY')
      return !!claudeKey // Simple check - could be enhanced
    } catch {
      return false
    }
  }

  private static async checkMemory(): Promise<boolean> {
    try {
      const memInfo = Deno.memoryUsage()
      const usedMB = memInfo.heapUsed / 1024 / 1024
      return usedMB < 500 // Less than 500MB
    } catch {
      return false
    }
  }

  private static async checkDisk(): Promise<boolean> {
    try {
      // Simple disk check - could be enhanced
      return true
    } catch {
      return false
    }
  }

  private static getUptime(): number {
    try {
      // In Deno, we can use performance.now() for uptime
      return Math.floor(performance.now() / 1000)
    } catch {
      return 0
    }
  }

  private static async getPropertiesCount(): Promise<number> {
    try {
      // Mock implementation
      return Math.floor(Math.random() * 10000) + 1000
    } catch {
      return 0
    }
  }

  private static async getRecentUpdates(): Promise<number> {
    try {
      // Mock implementation
      return Math.floor(Math.random() * 100)
    } catch {
      return 0
    }
  }

  private static async getStorageSize(): Promise<string> {
    try {
      // Mock implementation
      const sizeMB = Math.floor(Math.random() * 1000) + 100
      return `${sizeMB} MB`
    } catch {
      return '0 MB'
    }
  }

  private static async getAvgResponseTime(): Promise<number> {
    try {
      // Mock implementation
      return Math.floor(Math.random() * 500) + 100 // 100-600ms
    } catch {
      return 0
    }
  }

  private static async getMemoryUsage(): Promise<string> {
    try {
      const memInfo = Deno.memoryUsage()
      const usedMB = Math.floor(memInfo.heapUsed / 1024 / 1024)
      return `${usedMB} MB`
    } catch {
      return '0 MB'
    }
  }

  private static async getCpuUsage(): Promise<string> {
    try {
      // Mock implementation - Deno doesn't have built-in CPU usage
      return `${Math.floor(Math.random() * 50) + 10}%`
    } catch {
      return '0%'
    }
  }
}