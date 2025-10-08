import { serve } from "std/http/server.ts";
import { configManager } from './config-manager.ts';
import { controller } from './controller.ts';
import { dashboard } from './dashboard.ts';
import { metrics } from './metrics.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey'
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: corsHeaders });

  try {
    await configManager.loadConfig();
    const url = new URL(req.url);
    const parts = url.pathname.replace(/^\/+/, '').split('/');
    const action = parts[0] || 'help';

    // Simple routing
    switch (`${req.method}:${action}`) {
      case 'GET:status':
        return dashboard.getStatus();
      case 'GET:metrics':
        return metrics.getSystemMetrics();
      case 'GET:health':
        try {
          const status = await controller.getSystemStatus();
          return new Response(JSON.stringify(status), { headers: { 'Content-Type': 'application/json', ...corsHeaders } });
        } catch {
          return new Response(JSON.stringify({ status: 'unhealthy' }), { status: 503, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
        }
      case 'POST:enable-scraping':
        return controller.enableScraping();
      case 'POST:disable-scraping':
        return controller.disableScraping();
      case 'POST:run-now':
        return controller.runImmediateBatch();
      case 'POST:emergency-stop':
        return controller.emergencyStop();
      case 'GET:config': {
        const res = configManager.getConfig();
        return new Response(JSON.stringify({ config: res, last_updated: new Date().toISOString() }), { headers: { 'Content-Type': 'application/json', ...corsHeaders } });
      }
      case 'POST:config': {
  const updates = await req.json().catch(() => ({} as Record<string, unknown>));
  await controller.updateConfig(updates as Record<string, unknown>);
        return new Response(JSON.stringify({ status: 'ok' }), { headers: { 'Content-Type': 'application/json', ...corsHeaders } });
      }
      case 'GET:help':
      default:
        return new Response(JSON.stringify(handleHelp()), { headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
  }
});

function handleHelp() {
  return {
    title: 'Real Estate Scraper - Command Center',
    version: '1.0.0',
    description: 'Central command and control interface for the scraping system',
    endpoints: {
      monitoring: ['GET /status', 'GET /metrics', 'GET /health', 'GET /activity?limit=20'],
      control: ['POST /enable-scraping', 'POST /disable-scraping', 'POST /run-now', 'POST /emergency-stop'],
      configuration: ['GET /config', 'POST /config'],
      analytics: ['GET /trends/{metric}', 'GET /batch/{batch_id}'],
      utility: ['GET /help', 'GET /version']
    }
  };
}

