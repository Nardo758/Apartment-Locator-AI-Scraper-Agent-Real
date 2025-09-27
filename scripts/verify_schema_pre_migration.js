const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
import process from "node:process";

// Load environment variables
const envFile = '.env.local';
if (fs.existsSync(envFile)) {
  const lines = fs.readFileSync(envFile, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    if (!line || line.trim().startsWith('#') || line.indexOf('=') === -1) continue;
    const parts = line.split('=');
    const key = parts.shift().trim();
    const val = parts.join('=').trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { 
  auth: { persistSession: false } 
});

/**
 * Verify database schema before location fields migration
 */
async function verifyPreMigration() {
  console.log('🔍 Verifying database schema before location fields migration...\n');

  let allPassed = true;
  const results = [];

  // Check if scraped_properties table exists
  try {
    const { data: _data, error } = await supabase
      .from('scraped_properties')
      .select('id')
      .limit(1);
    
    if (error) {
      results.push({ test: 'scraped_properties table exists', status: '❌ FAIL', details: error.message });
      allPassed = false;
    } else {
      results.push({ test: 'scraped_properties table exists', status: '✅ PASS', details: 'Table accessible' });
    }
  } catch (err) {
    results.push({ test: 'scraped_properties table exists', status: '❌ FAIL', details: err.message });
    allPassed = false;
  }

  // Check current table structure
  try {
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'scraped_properties'
        ORDER BY ordinal_position;
      `
    });

    if (error) {
      results.push({ test: 'Table structure query', status: '❌ FAIL', details: error.message });
      allPassed = false;
    } else {
      results.push({ test: 'Table structure query', status: '✅ PASS', details: `${data.length} columns found` });
      
      // Check if location columns already exist
      const existingColumns = data.map(col => col.column_name);
      const locationColumns = ['latitude', 'longitude', 'zip_code'];
      
      for (const col of locationColumns) {
        if (existingColumns.includes(col)) {
          results.push({ 
            test: `Column '${col}' exists`, 
            status: '⚠️  WARN', 
            details: 'Column already exists - migration will be skipped for this column' 
          });
        } else {
          results.push({ 
            test: `Column '${col}' ready for creation`, 
            status: '✅ PASS', 
            details: 'Column does not exist - will be created' 
          });
        }
      }
    }
  } catch (err) {
    results.push({ test: 'Table structure query', status: '❌ FAIL', details: err.message });
    allPassed = false;
  }

  // Check table size and estimate migration impact
  try {
    const { data, error } = await supabase
      .from('scraped_properties')
      .select('id', { count: 'exact', head: true });
    
    if (error) {
      results.push({ test: 'Table size check', status: '❌ FAIL', details: error.message });
      allPassed = false;
    } else {
      const rowCount = data?.length || 0;
      const estimatedSpace = Math.ceil(rowCount * 26 / 1024 / 1024); // Rough estimate in MB
      results.push({ 
        test: 'Table size analysis', 
        status: '✅ PASS', 
        details: `${rowCount} rows, estimated additional space: ~${estimatedSpace}MB` 
      });
    }
  } catch (err) {
    results.push({ test: 'Table size check', status: '❌ FAIL', details: err.message });
    allPassed = false;
  }

  // Check for existing indexes that might conflict
  try {
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT indexname, indexdef
        FROM pg_indexes 
        WHERE tablename = 'scraped_properties'
        AND schemaname = 'public'
        ORDER BY indexname;
      `
    });

    if (error) {
      results.push({ test: 'Index check', status: '❌ FAIL', details: error.message });
      allPassed = false;
    } else {
      const locationIndexes = data.filter(idx => 
        idx.indexname.includes('location') || 
        idx.indexname.includes('zip_code')
      );
      
      if (locationIndexes.length > 0) {
        results.push({ 
          test: 'Location indexes check', 
          status: '⚠️  WARN', 
          details: `${locationIndexes.length} location-related indexes already exist` 
        });
      } else {
        results.push({ 
          test: 'Location indexes check', 
          status: '✅ PASS', 
          details: 'No conflicting indexes found' 
        });
      }
    }
  } catch (err) {
    results.push({ test: 'Index check', status: '❌ FAIL', details: err.message });
    allPassed = false;
  }

  // Print results
  console.log('📋 Pre-Migration Verification Results:');
  console.log(''.padEnd(80, '='));
  
  for (const result of results) {
    console.log(`${result.status} ${result.test.padEnd(35)} | ${result.details}`);
  }
  
  console.log(''.padEnd(80, '='));
  
  if (allPassed) {
    console.log('🎉 All checks passed! Ready to proceed with migration.');
    return true;
  } else {
    console.log('⚠️  Some checks failed. Please review and fix issues before proceeding.');
    return false;
  }
}

/**
 * Generate a pre-migration snapshot for comparison
 */
async function generatePreMigrationSnapshot() {
  console.log('\n📸 Generating pre-migration snapshot...');
  
  try {
    // Get table schema
    const { data: schemaData, error: schemaError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'scraped_properties'
        ORDER BY ordinal_position;
      `
    });

    if (schemaError) {
      console.error('❌ Failed to get schema:', schemaError);
      return;
    }

    // Get sample data
    const { data: sampleData, error: sampleError } = await supabase
      .from('scraped_properties')
      .select('*')
      .limit(5);

    if (sampleError) {
      console.error('❌ Failed to get sample data:', sampleError);
      return;
    }

    // Get row count
    const { data: countData, error: _countError } = await supabase
      .from('scraped_properties')
      .select('id', { count: 'exact', head: true });

    const snapshot = {
      timestamp: new Date().toISOString(),
      migration: '20250925083520_add_location_fields_to_scraped_properties',
      schema: schemaData,
      rowCount: countData?.length || 0,
      sampleData: sampleData?.slice(0, 2) || [], // Just 2 rows for security
      checks: {
        hasLatitude: schemaData.some(col => col.column_name === 'latitude'),
        hasLongitude: schemaData.some(col => col.column_name === 'longitude'),
        hasZipCode: schemaData.some(col => col.column_name === 'zip_code')
      }
    };

    // Save snapshot
    const filename = `verification_pre_migration_${new Date().toISOString().replace(/:/g, '-').split('.')[0]}.json`;
    fs.writeFileSync(filename, JSON.stringify(snapshot, null, 2));
    console.log(`✅ Pre-migration snapshot saved to: ${filename}`);
    
    return snapshot;
  } catch (err) {
    console.error('❌ Failed to generate snapshot:', err);
  }
}

async function main() {
  console.log('🚀 Location Fields Migration - Pre-Migration Verification\n');
  
  const passed = await verifyPreMigration();
  await generatePreMigrationSnapshot();
  
  if (!passed) {
    process.exit(1);
  }
  
  console.log('\n✅ Verification complete. Proceed with migration when ready.');
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Pre-migration verification failed:', err);
    process.exit(1);
  });
}

module.exports = { verifyPreMigration, generatePreMigrationSnapshot };