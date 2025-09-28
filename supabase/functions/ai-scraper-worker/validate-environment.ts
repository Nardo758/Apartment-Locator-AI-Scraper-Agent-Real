#!/usr/bin/env -S deno run --allow-env --allow-read --allow-net

/**
 * Environment Validation Script
 * 
 * Validates all required environment variables and system dependencies
 * before running the real integration tests.
 */

interface ValidationResult {
  category: string;
  item: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: string;
}

class EnvironmentValidator {
  private results: ValidationResult[] = [];

  private addResult(category: string, item: string, status: 'pass' | 'fail' | 'warning', message: string, details?: string) {
    this.results.push({ category, item, status, message, details });
  }

  async validateEnvironmentVariables(): Promise<void> {
    const requiredVars = [
      { name: 'OPENAI_API_KEY', description: 'OpenAI API access' },
      { name: 'SUPABASE_URL', description: 'Supabase project URL' },
      { name: 'SUPABASE_SERVICE_ROLE_KEY', description: 'Supabase service role key' }
    ];

    const optionalVars = [
      { name: 'SUPABASE_ANON_KEY', description: 'Supabase anonymous key' },
      { name: 'ANTHROPIC_API_KEY', description: 'Anthropic/Claude API key' },
      { name: 'TEST_BATCH_SIZE', description: 'Test batch size configuration' },
      { name: 'TEST_DELAY_MS', description: 'Delay between test batches' },
      { name: 'COST_ALERT_THRESHOLD', description: 'Cost alert threshold' }
    ];

    // Check required variables
    for (const envVar of requiredVars) {
      const value = Deno.env.get(envVar.name);
      if (!value) {
        this.addResult('Environment', envVar.name, 'fail', `Missing required environment variable`, envVar.description);
      } else if (value.includes('your_') || value.includes('here')) {
        this.addResult('Environment', envVar.name, 'fail', `Environment variable contains placeholder text`, 'Please set actual value');
      } else {
        // Basic format validation
        if (envVar.name === 'OPENAI_API_KEY' && !value.startsWith('sk-')) {
          this.addResult('Environment', envVar.name, 'warning', `OpenAI API key format may be incorrect`, 'Should start with "sk-"');
        } else if (envVar.name === 'SUPABASE_URL' && !value.startsWith('https://')) {
          this.addResult('Environment', envVar.name, 'warning', `Supabase URL format may be incorrect`, 'Should start with "https://"');
        } else {
          this.addResult('Environment', envVar.name, 'pass', `Environment variable is set`, `Length: ${value.length} characters`);
        }
      }
    }

    // Check optional variables
    for (const envVar of optionalVars) {
      const value = Deno.env.get(envVar.name);
      if (value) {
        this.addResult('Environment', envVar.name, 'pass', `Optional variable is set`, envVar.description);
      }
    }
  }

  async validateSystemDependencies(): Promise<void> {
    // Check Deno version
    try {
      const denoVersion = Deno.version.deno;
      const minVersion = '1.40.0';
      
      if (this.compareVersions(denoVersion, minVersion) >= 0) {
        this.addResult('System', 'Deno', 'pass', `Deno ${denoVersion} is installed`, `Minimum required: ${minVersion}`);
      } else {
        this.addResult('System', 'Deno', 'fail', `Deno version ${denoVersion} is too old`, `Minimum required: ${minVersion}`);
      }
    } catch (error) {
      this.addResult('System', 'Deno', 'fail', 'Failed to check Deno version', error.message);
    }

    // Check if .env.local exists
    try {
      await Deno.stat('.env.local');
      this.addResult('System', '.env.local', 'pass', 'Environment file exists', 'Found .env.local file');
    } catch {
      this.addResult('System', '.env.local', 'fail', 'Environment file missing', 'Create .env.local from template');
    }

    // Check network connectivity
    await this.checkNetworkConnectivity();
  }

  async checkNetworkConnectivity(): Promise<void> {
    const endpoints = [
      { name: 'OpenAI API', url: 'https://api.openai.com', timeout: 5000 },
      { name: 'Supabase', url: 'https://supabase.com', timeout: 5000 }
    ];

    for (const endpoint of endpoints) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), endpoint.timeout);
        
        const response = await fetch(endpoint.url, {
          method: 'HEAD',
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok || response.status === 405) { // 405 is also acceptable for HEAD requests
          this.addResult('Network', endpoint.name, 'pass', 'Network connectivity confirmed', `Status: ${response.status}`);
        } else {
          this.addResult('Network', endpoint.name, 'warning', `Unexpected response status`, `Status: ${response.status}`);
        }
      } catch (error) {
        if (error.name === 'AbortError') {
          this.addResult('Network', endpoint.name, 'fail', 'Network request timed out', `Timeout: ${endpoint.timeout}ms`);
        } else {
          this.addResult('Network', endpoint.name, 'fail', 'Network connectivity failed', error.message);
        }
      }
    }
  }

  async validateApiAccess(): Promise<void> {
    // Test OpenAI API access
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (openaiKey && openaiKey.startsWith('sk-')) {
      try {
        const response = await fetch('https://api.openai.com/v1/models', {
          headers: {
            'Authorization': `Bearer ${openaiKey}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          const hasGpt4 = data.data?.some((model: any) => model.id.includes('gpt-4'));
          this.addResult('API Access', 'OpenAI', 'pass', 'OpenAI API access confirmed', 
            `Found ${data.data?.length || 0} models${hasGpt4 ? ' (GPT-4 available)' : ''}`);
        } else if (response.status === 401) {
          this.addResult('API Access', 'OpenAI', 'fail', 'OpenAI API authentication failed', 'Check your API key');
        } else {
          this.addResult('API Access', 'OpenAI', 'fail', `OpenAI API error`, `Status: ${response.status}`);
        }
      } catch (error) {
        this.addResult('API Access', 'OpenAI', 'fail', 'OpenAI API request failed', error.message);
      }
    }

    // Test Supabase access
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (supabaseUrl && supabaseKey) {
      try {
        const response = await fetch(`${supabaseUrl}/rest/v1/`, {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
          }
        });

        if (response.ok || response.status === 404) { // 404 is expected for root endpoint
          this.addResult('API Access', 'Supabase', 'pass', 'Supabase API access confirmed', `Status: ${response.status}`);
        } else if (response.status === 401) {
          this.addResult('API Access', 'Supabase', 'fail', 'Supabase authentication failed', 'Check your service role key');
        } else {
          this.addResult('API Access', 'Supabase', 'fail', `Supabase API error`, `Status: ${response.status}`);
        }
      } catch (error) {
        this.addResult('API Access', 'Supabase', 'fail', 'Supabase API request failed', error.message);
      }
    }
  }

  async validateLocalFunction(): Promise<void> {
    // Check if function server is running
    try {
      const response = await fetch('http://localhost:54321/functions/v1/ai-scraper-worker', {
        method: 'GET'
      });
      
      this.addResult('Local Function', 'Server Status', 'pass', 'Function server is running', `Status: ${response.status}`);
    } catch (error) {
      this.addResult('Local Function', 'Server Status', 'fail', 'Function server is not running', 
        'Start with: supabase functions serve ai-scraper-worker --env-file .env.local');
    }
  }

  private compareVersions(version1: string, version2: string): number {
    const v1parts = version1.split('.').map(n => parseInt(n));
    const v2parts = version2.split('.').map(n => parseInt(n));
    
    for (let i = 0; i < Math.max(v1parts.length, v2parts.length); i++) {
      const v1part = v1parts[i] || 0;
      const v2part = v2parts[i] || 0;
      
      if (v1part > v2part) return 1;
      if (v1part < v2part) return -1;
    }
    return 0;
  }

  generateReport(): void {
    console.log("🔍 ENVIRONMENT VALIDATION REPORT");
    console.log("=" .repeat(50));
    console.log();

    const categories = [...new Set(this.results.map(r => r.category))];
    
    let totalPass = 0;
    let totalFail = 0;
    let totalWarning = 0;

    categories.forEach(category => {
      const categoryResults = this.results.filter(r => r.category === category);
      const categoryPass = categoryResults.filter(r => r.status === 'pass').length;
      const categoryFail = categoryResults.filter(r => r.status === 'fail').length;
      const categoryWarning = categoryResults.filter(r => r.status === 'warning').length;

      console.log(`📂 ${category}`);
      console.log("-" .repeat(30));

      categoryResults.forEach(result => {
        const icon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⚠️';
        console.log(`${icon} ${result.item}: ${result.message}`);
        if (result.details) {
          console.log(`   ${result.details}`);
        }
      });
      
      console.log(`   Summary: ${categoryPass} pass, ${categoryFail} fail, ${categoryWarning} warning`);
      console.log();

      totalPass += categoryPass;
      totalFail += categoryFail;
      totalWarning += categoryWarning;
    });

    console.log("📊 OVERALL SUMMARY");
    console.log("=" .repeat(30));
    console.log(`✅ Passed: ${totalPass}`);
    console.log(`❌ Failed: ${totalFail}`);
    console.log(`⚠️  Warnings: ${totalWarning}`);
    console.log(`📋 Total: ${this.results.length}`);
    console.log();

    if (totalFail === 0) {
      console.log("🎉 Environment validation PASSED! You're ready to run integration tests.");
    } else if (totalFail <= 2 && totalWarning <= 3) {
      console.log("⚠️  Environment validation passed with issues. Review failures before testing.");
    } else {
      console.log("❌ Environment validation FAILED. Please fix the issues before proceeding.");
      console.log();
      console.log("🔧 Quick fixes:");
      this.results.filter(r => r.status === 'fail').forEach(result => {
        console.log(`   • ${result.category}/${result.item}: ${result.details || result.message}`);
      });
    }
  }

  async runFullValidation(): Promise<boolean> {
    console.log("🔍 Starting environment validation...");
    console.log();

    await this.validateEnvironmentVariables();
    await this.validateSystemDependencies();
    await this.validateApiAccess();
    await this.validateLocalFunction();

    this.generateReport();

    const failures = this.results.filter(r => r.status === 'fail').length;
    return failures === 0;
  }
}

// Main execution
if (import.meta.main) {
  const validator = new EnvironmentValidator();
  const success = await validator.runFullValidation();
  
  if (!success) {
    Deno.exit(1);
  }
}