#!/usr/bin/env node
/**
 * Apartment Scraper Control Panel
 * 
 * Simple CLI interface to manage all scraper components
 * - Turn components on/off
 * - Set schedules
 * - Check status
 * - View logs
 * 
 * Usage:
 *   node control-panel.mjs status
 *   node control-panel.mjs enable ai-scraper
 *   node control-panel.mjs disable claude-queue
 *   node control-panel.mjs schedule ai-scraper "0 0 * * *"
 *   node control-panel.mjs run-now ai-scraper
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, existsSync } from 'fs';

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54380';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_KEY) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Configuration file path
const CONFIG_FILE = './scraper-config.json';

// Component definitions
const COMPONENTS = {
    'ai-scraper-worker': {
        name: 'AI Scraper Worker',
        description: 'Primary scraping worker with AI enhancement',
        type: 'worker',
        path: 'supabase/functions/ai-scraper-worker',
        default_schedule: '0 2 * * *',  // 2 AM daily
    },
    'claude-queue-builder': {
        name: 'Claude Queue Builder',
        description: 'Builds scraping queues with Claude AI',
        type: 'queue',
        path: 'supabase/functions/claude-queue-builder',
        default_schedule: '0 1 * * 0',  // 1 AM Sunday
    },
    'command-station': {
        name: 'Command Station',
        description: 'Central control and monitoring',
        type: 'control',
        path: 'supabase/functions/command-station',
        default_schedule: 'always',  // Always on
    },
    'scraper-orchestrator': {
        name: 'Scraper Orchestrator',
        description: 'Coordinates multiple scraper workers',
        type: 'orchestrator',
        path: 'supabase/functions/scraper-orchestrator',
        default_schedule: '0 */6 * * *',  // Every 6 hours
    },
    'scheduled-scraper': {
        name: 'Scheduled Scraper',
        description: 'Runs scheduled scraping jobs',
        type: 'worker',
        path: 'supabase/functions/scheduled-scraper',
        default_schedule: '0 0 * * 0',  // Weekly on Sunday
    }
};

// Load or create config
function loadConfig() {
    if (existsSync(CONFIG_FILE)) {
        try {
            const data = readFileSync(CONFIG_FILE, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.warn('⚠️  Could not load config file, using defaults');
        }
    }
    
    // Default config
    const defaultConfig = {
        components: {},
        global: {
            enabled: true,
            max_concurrent_jobs: 5,
            daily_cost_limit: 50,
            auto_retry: true
        },
        last_updated: new Date().toISOString()
    };
    
    // Initialize component configs
    for (const [key, component] of Object.entries(COMPONENTS)) {
        defaultConfig.components[key] = {
            enabled: key === 'command-station',  // Command station on by default
            schedule: component.default_schedule,
            last_run: null,
            run_count: 0
        };
    }
    
    saveConfig(defaultConfig);
    return defaultConfig;
}

// Save config
function saveConfig(config) {
    config.last_updated = new Date().toISOString();
    writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

// Update system_config table in database
async function updateDatabaseConfig(config) {
    try {
        const { error } = await supabase
            .from('system_config')
            .upsert({
                config_key: 'scraper_system',
                config_value: config,
                updated_at: new Date().toISOString()
            });
        
        if (error) throw error;
        return true;
    } catch (error) {
        console.warn('⚠️  Could not update database config:', error.message);
        return false;
    }
}

// Display status
async function showStatus() {
    console.log('\n🎛️  SCRAPER CONTROL PANEL - System Status');
    console.log('='.repeat(70));
    
    const config = loadConfig();
    
    // Global status
    console.log('\n📊 Global Settings:');
    console.log(`   System: ${config.global.enabled ? '🟢 ENABLED' : '🔴 DISABLED'}`);
    console.log(`   Max Concurrent Jobs: ${config.global.max_concurrent_jobs}`);
    console.log(`   Daily Cost Limit: $${config.global.daily_cost_limit}`);
    console.log(`   Auto Retry: ${config.global.auto_retry ? 'Yes' : 'No'}`);
    
    // Component status
    console.log('\n🔧 Components:');
    console.log('');
    
    for (const [key, component] of Object.entries(COMPONENTS)) {
        const cfg = config.components[key];
        const status = cfg.enabled ? '🟢 ON ' : '🔴 OFF';
        const schedule = cfg.schedule === 'always' ? '⏰ Always Active' : `⏰ ${cfg.schedule}`;
        
        console.log(`   ${status} ${component.name}`);
        console.log(`      ${component.description}`);
        console.log(`      ${schedule}`);
        console.log(`      Runs: ${cfg.run_count} | Last: ${cfg.last_run || 'Never'}`);
        console.log('');
    }
    
    // Database status
    try {
        const { count, error } = await supabase
            .from('scraped_properties')
            .select('*', { count: 'exact', head: true });
        
        if (!error) {
            console.log(`📦 Database: ${count} properties stored`);
        }
    } catch (e) {
        console.log('📦 Database: Connection unavailable');
    }
    
    console.log(`\n⏰ Last Updated: ${new Date(config.last_updated).toLocaleString()}`);
    console.log('='.repeat(70));
    console.log('\n💡 Tip: Use "node control-panel.mjs help" for command list\n');
}

// Enable component
function enableComponent(componentKey) {
    if (!COMPONENTS[componentKey]) {
        console.error(`❌ Unknown component: ${componentKey}`);
        console.log('Available components:', Object.keys(COMPONENTS).join(', '));
        return;
    }
    
    const config = loadConfig();
    config.components[componentKey].enabled = true;
    saveConfig(config);
    updateDatabaseConfig(config);
    
    console.log(`✅ Enabled: ${COMPONENTS[componentKey].name}`);
    console.log(`   Schedule: ${config.components[componentKey].schedule}`);
}

// Disable component
function disableComponent(componentKey) {
    if (!COMPONENTS[componentKey]) {
        console.error(`❌ Unknown component: ${componentKey}`);
        return;
    }
    
    const config = loadConfig();
    config.components[componentKey].enabled = false;
    saveConfig(config);
    updateDatabaseConfig(config);
    
    console.log(`🔴 Disabled: ${COMPONENTS[componentKey].name}`);
}

// Set schedule
function setSchedule(componentKey, cronSchedule) {
    if (!COMPONENTS[componentKey]) {
        console.error(`❌ Unknown component: ${componentKey}`);
        return;
    }
    
    const config = loadConfig();
    config.components[componentKey].schedule = cronSchedule;
    saveConfig(config);
    updateDatabaseConfig(config);
    
    console.log(`⏰ Updated schedule for: ${COMPONENTS[componentKey].name}`);
    console.log(`   New schedule: ${cronSchedule}`);
    console.log('\n📝 Cron format: "minute hour day month weekday"');
    console.log('   Examples:');
    console.log('   - "0 2 * * *"     = Daily at 2 AM');
    console.log('   - "0 0 * * 0"     = Weekly on Sunday at midnight');
    console.log('   - "0 */6 * * *"   = Every 6 hours');
    console.log('   - "*/30 * * * *"  = Every 30 minutes');
}

// Run component now
async function runNow(componentKey) {
    if (!COMPONENTS[componentKey]) {
        console.error(`❌ Unknown component: ${componentKey}`);
        return;
    }
    
    const component = COMPONENTS[componentKey];
    console.log(`🚀 Triggering: ${component.name}...`);
    
    try {
        // Update run count
        const config = loadConfig();
        config.components[componentKey].last_run = new Date().toISOString();
        config.components[componentKey].run_count++;
        saveConfig(config);
        
        // Call the function endpoint
        const response = await fetch(
            `${SUPABASE_URL}/functions/v1/${componentKey}`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ trigger: 'manual', timestamp: new Date().toISOString() })
            }
        );
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Success!');
            console.log('Response:', JSON.stringify(data, null, 2));
        } else {
            console.log(`⚠️  Status: ${response.status}`);
            const text = await response.text();
            console.log('Response:', text);
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

// Enable all components
function enableAll() {
    const config = loadConfig();
    for (const key of Object.keys(COMPONENTS)) {
        config.components[key].enabled = true;
    }
    config.global.enabled = true;
    saveConfig(config);
    updateDatabaseConfig(config);
    console.log('✅ All components enabled');
}

// Disable all components
function disableAll() {
    const config = loadConfig();
    for (const key of Object.keys(COMPONENTS)) {
        config.components[key].enabled = false;
    }
    config.global.enabled = false;
    saveConfig(config);
    updateDatabaseConfig(config);
    console.log('🔴 All components disabled');
}

// Reset to defaults
function resetDefaults() {
    if (existsSync(CONFIG_FILE)) {
        writeFileSync(CONFIG_FILE + '.backup', readFileSync(CONFIG_FILE));
        console.log('📋 Backed up existing config to scraper-config.json.backup');
    }
    
    loadConfig();  // This will create default config
    console.log('🔄 Reset to default configuration');
    console.log('✅ Command station enabled by default');
    console.log('🔴 All other components disabled by default');
}

// Show help
function showHelp() {
    console.log(`
🎛️  SCRAPER CONTROL PANEL - Help
${'='.repeat(70)}

USAGE:
  node control-panel.mjs <command> [arguments]

COMMANDS:
  status                          Show system status and component states
  
  enable <component>              Enable a component
  disable <component>             Disable a component
  
  schedule <component> "<cron>"   Set component schedule (cron format)
  run-now <component>             Trigger component immediately
  
  enable-all                      Enable all components
  disable-all                     Disable all components (emergency stop)
  
  reset                           Reset to default configuration
  list                            List all available components
  help                            Show this help message

COMPONENTS:
${Object.entries(COMPONENTS).map(([key, c]) => `  - ${key.padEnd(25)} ${c.name}`).join('\n')}

SCHEDULE EXAMPLES:
  "0 2 * * *"       Daily at 2 AM
  "0 0 * * 0"       Weekly on Sunday midnight
  "0 */6 * * *"     Every 6 hours
  "*/30 * * * *"    Every 30 minutes
  "0 9-17 * * 1-5"  9 AM - 5 PM, Monday-Friday

EXAMPLES:
  node control-panel.mjs status
  node control-panel.mjs enable ai-scraper-worker
  node control-panel.mjs schedule ai-scraper-worker "0 2 * * *"
  node control-panel.mjs run-now claude-queue-builder
  node control-panel.mjs disable-all

CONFIGURATION:
  Config file: ./scraper-config.json
  Environment: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

${'='.repeat(70)}
`);
}

// List components
function listComponents() {
    console.log('\n📋 Available Components:\n');
    
    for (const [key, component] of Object.entries(COMPONENTS)) {
        console.log(`   ${key}`);
        console.log(`      Name: ${component.name}`);
        console.log(`      Type: ${component.type}`);
        console.log(`      Description: ${component.description}`);
        console.log(`      Default Schedule: ${component.default_schedule}`);
        console.log('');
    }
}

// Main CLI handler
async function main() {
    const args = process.argv.slice(2);
    const command = args[0];
    
    if (!command || command === 'help') {
        showHelp();
        return;
    }
    
    switch (command) {
        case 'status':
            await showStatus();
            break;
            
        case 'enable':
            if (!args[1]) {
                console.error('❌ Please specify a component to enable');
                console.log('Use: node control-panel.mjs list');
            } else {
                enableComponent(args[1]);
            }
            break;
            
        case 'disable':
            if (!args[1]) {
                console.error('❌ Please specify a component to disable');
            } else {
                disableComponent(args[1]);
            }
            break;
            
        case 'schedule':
            if (!args[1] || !args[2]) {
                console.error('❌ Usage: schedule <component> "<cron>"');
                console.log('Example: schedule ai-scraper-worker "0 2 * * *"');
            } else {
                setSchedule(args[1], args[2]);
            }
            break;
            
        case 'run-now':
            if (!args[1]) {
                console.error('❌ Please specify a component to run');
            } else {
                await runNow(args[1]);
            }
            break;
            
        case 'enable-all':
            enableAll();
            break;
            
        case 'disable-all':
            disableAll();
            break;
            
        case 'reset':
            resetDefaults();
            break;
            
        case 'list':
            listComponents();
            break;
            
        default:
            console.error(`❌ Unknown command: ${command}`);
            console.log('Use: node control-panel.mjs help');
    }
}

// Run
main().catch(error => {
    console.error('❌ Error:', error.message);
    process.exit(1);
});
