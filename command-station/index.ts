// command-station/index.ts - MAIN COMMAND CENTER
import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { Dashboard } from './dashboard.ts'
import { Controller } from './controller.ts'
import { Metrics } from './metrics.ts'
import { ConfigManager } from './config-manager.ts'

serve(async (req: Request) => {
  const url = new URL(req.url)
  const action = url.pathname.split('/').pop()
  
  try {
    // 🎛️ Command Router
    switch (action) {
      case 'status':
        return await Dashboard.getSystemStatus()
      
      case 'enable-scraping':
        return await Controller.enableScraping()
      
      case 'disable-scraping':
        return await Controller.disableScraping()
      
      case 'metrics':
        return await Metrics.getSystemMetrics()
      
      case 'run-now':
        return await Controller.runImmediateBatch()
      
      case 'config':
        if (req.method === 'GET') {
          return await ConfigManager.getConfig()
        } else if (req.method === 'POST') {
          const configData = await req.json()
          return await Controller.updateConfig(configData)
        }
        break
      
      case 'health':
        return new Response(JSON.stringify({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          version: '1.0.0'
        }), {
          headers: { 'Content-Type': 'application/json' }
        })
      
      default:
        return new Response(JSON.stringify({
          message: '🎯 Real Estate Scraper Command Station',
          available_commands: [
            'GET /status - System status dashboard',
            'POST /enable-scraping - Enable scraping system',
            'POST /disable-scraping - Disable scraping system',
            'GET /metrics - Performance metrics',
            'POST /run-now - Run immediate batch',
            'GET /config - Get current configuration',
            'POST /config - Update configuration',
            'GET /health - Health check'
          ],
          documentation: 'https://github.com/your-repo/docs/command-station.md'
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200
        })
    }
  } catch (error) {
    console.error('Command Station Error:', error)
    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})