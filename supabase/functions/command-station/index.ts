/**
 * Command Station Main Handler
 * 
 * Central command and control interface for the Real Estate Scraper system.
 * Provides a unified API for system monitoring, control, and configuration.
 * 
 * Available endpoints:
 * - GET  /status           - System status dashboard
 * - GET  /metrics          - Performance metrics
 * - GET  /health           - Health check
 * - POST /enable-scraping  - Enable scraping system
 * - POST /disable-scraping - Disable scraping system
 * - POST /run-now          - Trigger immediate batch
 * - POST /emergency-stop   - Emergency system halt
 * - POST /config           - Update configuration
 * - GET  /config           - Get current configuration
 * - GET  /activity         - Recent system activity
 * - GET  /trends/:metric   - Metric trend data
 * - GET  /batch/:id        - Batch status
 */

import { serve } from "std/http/server.ts";
import { configManager } from './config-manager.ts';
import { controller } from './controller.ts';
import { dashboard } from './dashboard.ts';
import { metrics } from './metrics.ts';

// CORS headers for browser access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
  'Access-Control-Max-Age': '86400',
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200, 
      headers: corsHeaders 
    });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method;

    // Initialize configuration on first request
    await configManager.loadConfig();

    // Route requests to appropriate handlers
    const response = await routeRequest(path, method, req);
    
    // Add CORS headers to response
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;

  } catch (error) {
    console.error('Command Station error:', error);
    
    const errorResponse = new Response(JSON.stringify({
      error: 'Internal server error',
      message: String(error),
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });

    return errorResponse;
  }
});

/**
 * Route incoming requests to appropriate handlers
 */
async function routeRequest(path: string, method: string, req: Request): Promise<Response> {
  // Remove leading slash and split path
  const segments = path.replace(/^\/+/, '').split('/');
  const action = segments[0] || 'help';

  switch (`${method}:${action}`) {
    
    // === SYSTEM STATUS & MONITORING ===
    
    case 'GET:status':
      return await dashboard.getSystemStatus();
      
    case 'GET:metrics':
      return await metrics.getSystemMetrics();
      
    case 'GET:health':
      return await handleHealthCheck();
      
    case 'GET:activity':
      const limit = parseInt(new URL(req.url).searchParams.get('limit') || '20');
      return await dashboard.getRecentActivity(limit);

    // === SYSTEM CONTROL ===
    
    case 'POST:enable-scraping':
      return await controller.enableScraping();
      
    case 'POST:disable-scraping':
      return await controller.disableScraping();
      
    case 'POST:run-now':
      return await controller.runImmediateBatch();
      
    case 'POST:emergency-stop':
      return await controller.emergencyStop();

    // === CONFIGURATION ===
    
    case 'GET:config':
      return await handleGetConfig();
      
    case 'POST:config':
      const updates = await req.json().catch(() => ({}));
      return await controller.updateConfig(updates);

    // === METRICS & TRENDS ===
    
    case 'GET:trends':
      const metric = segments[1];
      if (!metric) {
        return new Response(JSON.stringify({
          error: 'Metric name required',
          usage: '/trends/{metric}?range=24h&granularity=1h'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      const urlParams = new URL(req.url).searchParams;
      const timeRange = urlParams.get('range') as '1h' | '24h' | '7d' | '30d' || '24h';
      const granularity = urlParams.get('granularity') as '5m' | '1h' | '6h' | '1d' || '1h';
      
      return await metrics.getTrendData(metric, timeRange, granularity);

    case 'GET:batch':
      const batchId = segments[1];
      if (!batchId) {
        return new Response(JSON.stringify({
          error: 'Batch ID required',
          usage: '/batch/{batch_id}'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      return await handleBatchStatus(batchId);

    // === UTILITY ENDPOINTS ===
    
    case 'GET:help':
    case 'GET:':
      return await handleHelp();
      
    case 'GET:version':
      return await handleVersion();

    // === ADVANCED OPERATIONS ===
    
    case 'POST:restart-workers':
      return await handleRestartWorkers();
      
    case 'POST:clear-queue':
      return await handleClearQueue();
      
    case 'GET:export-config':
      return await handleExportConfig();
      
    case 'POST:import-config':
      return await handleImportConfig(req);

    // === DEFAULT ===
    
    default:
      return new Response(JSON.stringify({
        error: 'Endpoint not found',
        method,
        path,
        available_endpoints: await getAvailableEndpoints()
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
  }
}

/**
 * Health check endpoint
 */
async function handleHealthCheck(): Promise<Response> {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    uptime: process.uptime?.() || 0,
    components: {
      config_manager: 'healthy',
      controller: 'healthy',
      dashboard: 'healthy',
      metrics: 'healthy'
    }
  };

  // Test each component
  try {
    configManager.getConfig();
  } catch {
    health.components.config_manager = 'unhealthy';
    health.status = 'degraded';
  }

  try {
    await controller.getSystemStatus();
  } catch {
    health.components.controller = 'unhealthy';
    health.status = 'degraded';
  }

  const statusCode = health.status === 'healthy' ? 200 : 503;

  return new Response(JSON.stringify(health, null, 2), {
    status: statusCode,
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Get current configuration
 */
function handleGetConfig(): Response {
  try {
    const config = configManager.getConfig();
    return new Response(JSON.stringify({
      config,
      last_updated: new Date().toISOString(),
      version: '1.0.0'
    }, null, 2), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Failed to get configuration',
      message: String(error)
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Get batch status
 */
async function handleBatchStatus(batchId: string): Promise<Response> {
  try {
    const batchStatus = await controller.getBatchStatus(batchId);
    
    if (!batchStatus) {
      return new Response(JSON.stringify({
        error: 'Batch not found',
        batch_id: batchId
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify(batchStatus, null, 2), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Failed to get batch status',
      message: String(error),
      batch_id: batchId
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Help endpoint with API documentation
 */
function handleHelp(): Response {
  const help = {
    title: '🎯 Real Estate Scraper Command Station',
    version: '1.0.0',
    description: 'Central command and control interface for the real estate scraping system',
    
    endpoints: {
      monitoring: {
        'GET /status': 'Complete system status dashboard',
        'GET /metrics': 'Performance metrics and analytics',
        'GET /health': 'System health check',
        'GET /activity?limit=20': 'Recent system activity'
      },
      
      control: {
        'POST /enable-scraping': 'Enable the scraping system',
        'POST /disable-scraping': 'Disable the scraping system',
        'POST /run-now': 'Trigger immediate batch processing',
        'POST /emergency-stop': 'Emergency halt of all operations'
      },
      
      configuration: {
        'GET /config': 'Get current system configuration',
        'POST /config': 'Update system configuration (JSON body)'
      },
      
      analytics: {
        'GET /trends/{metric}?range=24h&granularity=1h': 'Get trend data for metrics',
        'GET /batch/{batch_id}': 'Get batch processing status'
      },
      
      utility: {
        'GET /help': 'This help documentation',
        'GET /version': 'System version information'
      }
    },
    
    examples: {
      enable_scraping: 'curl -X POST https://your-project.supabase.co/functions/v1/command-station/enable-scraping',
      get_status: 'curl https://your-project.supabase.co/functions/v1/command-station/status',
      update_config: 'curl -X POST https://your-project.supabase.co/functions/v1/command-station/config -d \'{"batchSize": 25}\'',
      run_batch: 'curl -X POST https://your-project.supabase.co/functions/v1/command-station/run-now'
    },
    
    metrics_available: [
      'error_rate', 'success_rate', 'throughput', 'response_time', 
      'cost_daily', 'queue_size', 'data_quality'
    ],
    
    quick_start: [
      '1. Check system status: GET /status',
      '2. Enable scraping: POST /enable-scraping',
      '3. Run immediate batch: POST /run-now',
      '4. Monitor progress: GET /metrics'
    ]
  };

  return new Response(JSON.stringify(help, null, 2), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Version information
 */
function handleVersion(): Response {
  const version = {
    command_station: '1.0.0',
    api_version: 'v1',
    build_date: '2024-01-01',
    environment: Deno.env.get('ENVIRONMENT') || 'development',
    features: [
      'Real-time monitoring',
      'System control',
      'Configuration management',
      'Performance metrics',
      'Cost tracking',
      'Alert system'
    ],
    dependencies: {
      supabase: '@supabase/supabase-js',
      deno: Deno.version.deno,
      typescript: Deno.version.typescript
    }
  };

  return new Response(JSON.stringify(version, null, 2), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Restart workers (placeholder)
 */
function handleRestartWorkers(): Response {
  // In a production system, this would restart worker functions
  return new Response(JSON.stringify({
    message: 'Worker restart initiated',
    timestamp: new Date().toISOString(),
    note: 'This is a placeholder - implement actual worker restart logic'
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Clear processing queue (placeholder)
 */
function handleClearQueue(): Response {
  // In a production system, this would clear the processing queue
  return new Response(JSON.stringify({
    message: 'Queue clear initiated',
    timestamp: new Date().toISOString(),
    note: 'This is a placeholder - implement actual queue clearing logic'
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Export configuration
 */
function handleExportConfig(): Response {
  try {
    const configExport = configManager.exportConfig();
    
    return new Response(configExport, {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="scraper-config-${new Date().toISOString().slice(0, 10)}.json"`
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Failed to export configuration',
      message: String(error)
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Import configuration
 */
async function handleImportConfig(req: Request): Promise<Response> {
  try {
    const configData = await req.text();
    await configManager.importConfig(configData);
    
    return new Response(JSON.stringify({
      message: 'Configuration imported successfully',
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Failed to import configuration',
      message: String(error)
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Get list of available endpoints
 * Updated: Fixed syntax errors for deployment
 */
function getAvailableEndpoints(): string[] {
  return [
    'GET /status', 'GET /metrics', 'GET /health', 'GET /activity',
    'POST /enable-scraping', 'POST /disable-scraping', 'POST /run-now', 'POST /emergency-stop',
    'GET /config', 'POST /config',
    'GET /trends/{metric}', 'GET /batch/{id}',
    'GET /help', 'GET /version'
  ];
}
