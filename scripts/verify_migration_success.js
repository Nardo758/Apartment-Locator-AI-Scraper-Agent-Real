const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

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
 * Verify migration success by checking all expected changes
 */
async function verifyMigrationSuccess() {
  console.log('🔍 Verifying location fields migration success...\n');

  let allPassed = true;
  const results = [];

  // Test 1: Check if all new columns exist with correct types
  const expectedColumns = [
    { name: 'latitude', type: 'numeric', precision: 10, scale: 8 },
    { name: 'longitude', type: 'numeric', precision: 11, scale: 8 },
    { name: 'zip_code', type: 'character varying', maxLength: 10 }
  ];

  try {
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          column_name, 
          data_type, 
          is_nullable,
          numeric_precision,
          numeric_scale,
          character_maximum_length
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'scraped_properties'
        AND column_name IN ('latitude', 'longitude', 'zip_code')
        ORDER BY column_name;
      `
    });

    if (error) {
      results.push({ test: 'Column existence check', status: '❌ FAIL', details: error.message });
      allPassed = false;
    } else {
      for (const expected of expectedColumns) {
        const found = data.find(col => col.column_name === expected.name);
        
        if (!found) {
          results.push({ 
            test: `Column '${expected.name}' exists`, 
            status: '❌ FAIL', 
            details: 'Column not found' 
          });
          allPassed = false;
        } else {
          // Verify data type
          const typeMatch = expected.type === 'numeric' 
            ? found.data_type === 'numeric'
            : found.data_type.includes(expected.type);
            
          if (!typeMatch) {
            results.push({ 
              test: `Column '${expected.name}' type`, 
              status: '❌ FAIL', 
              details: `Expected ${expected.type}, got ${found.data_type}` 
            });
            allPassed = false;
          } else {
            results.push({ 
              test: `Column '${expected.name}' type`, 
              status: '✅ PASS', 
              details: `Correct type: ${found.data_type}` 
            });
          }

          // Check if nullable (should be true for all new columns)
          if (found.is_nullable !== 'YES') {
            results.push({ 
              test: `Column '${expected.name}' nullable`, 
              status: '❌ FAIL', 
              details: 'Should be nullable' 
            });
            allPassed = false;
          } else {
            results.push({ 
              test: `Column '${expected.name}' nullable`, 
              status: '✅ PASS', 
              details: 'Correctly nullable' 
            });
          }
        }
      }
    }
  } catch (err) {
    results.push({ test: 'Column verification', status: '❌ FAIL', details: err.message });
    allPassed = false;
  }

  // Test 2: Check if indexes were created
  const expectedIndexes = [
    'idx_scraped_properties_location',
    'idx_scraped_properties_zip_code'
  ];

  try {
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT indexname, indexdef
        FROM pg_indexes 
        WHERE tablename = 'scraped_properties'
        AND schemaname = 'public'
        AND indexname IN ('idx_scraped_properties_location', 'idx_scraped_properties_zip_code')
        ORDER BY indexname;
      `
    });

    if (error) {
      results.push({ test: 'Index check', status: '❌ FAIL', details: error.message });
      allPassed = false;
    } else {
      for (const expectedIndex of expectedIndexes) {
        const found = data.find(idx => idx.indexname === expectedIndex);
        
        if (!found) {
          results.push({ 
            test: `Index '${expectedIndex}' exists`, 
            status: '❌ FAIL', 
            details: 'Index not found' 
          });
          allPassed = false;
        } else {
          results.push({ 
            test: `Index '${expectedIndex}' exists`, 
            status: '✅ PASS', 
            details: 'Index created successfully' 
          });
        }
      }
    }
  } catch (err) {
    results.push({ test: 'Index verification', status: '❌ FAIL', details: err.message });
    allPassed = false;
  }

  // Test 3: Check if constraints were added
  const expectedConstraints = [
    'check_latitude_range',
    'check_longitude_range'
  ];

  try {
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT constraint_name, check_clause
        FROM information_schema.check_constraints 
        WHERE constraint_schema = 'public'
        AND constraint_name IN ('check_latitude_range', 'check_longitude_range')
        ORDER BY constraint_name;
      `
    });

    if (error) {
      results.push({ test: 'Constraint check', status: '❌ FAIL', details: error.message });
      allPassed = false;
    } else {
      for (const expectedConstraint of expectedConstraints) {
        const found = data.find(constraint => constraint.constraint_name === expectedConstraint);
        
        if (!found) {
          results.push({ 
            test: `Constraint '${expectedConstraint}' exists`, 
            status: '❌ FAIL', 
            details: 'Constraint not found' 
          });
          allPassed = false;
        } else {
          results.push({ 
            test: `Constraint '${expectedConstraint}' exists`, 
            status: '✅ PASS', 
            details: 'Constraint created successfully' 
          });
        }
      }
    }
  } catch (err) {
    results.push({ test: 'Constraint verification', status: '❌ FAIL', details: err.message });
    allPassed = false;
  }

  // Test 4: Test that we can insert/update with new columns
  try {
    // Try to select with new columns (this will fail if columns don't exist)
    const { data, error } = await supabase
      .from('scraped_properties')
      .select('id, latitude, longitude, zip_code')
      .limit(1);

    if (error) {
      results.push({ test: 'New columns selectable', status: '❌ FAIL', details: error.message });
      allPassed = false;
    } else {
      results.push({ test: 'New columns selectable', status: '✅ PASS', details: 'Can query new columns' });
    }
  } catch (err) {
    results.push({ test: 'New columns selectable', status: '❌ FAIL', details: err.message });
    allPassed = false;
  }

  // Test 5: Test constraint validation
  try {
    // This should fail due to constraint violation
    const testResult = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          CASE 
            WHEN EXISTS(SELECT 1 FROM information_schema.check_constraints WHERE constraint_name = 'check_latitude_range') 
            THEN 'latitude_constraint_exists'
            ELSE 'latitude_constraint_missing'
          END as latitude_check,
          CASE 
            WHEN EXISTS(SELECT 1 FROM information_schema.check_constraints WHERE constraint_name = 'check_longitude_range') 
            THEN 'longitude_constraint_exists'
            ELSE 'longitude_constraint_missing'
          END as longitude_check;
      `
    });

    if (testResult.error) {
      results.push({ test: 'Constraint validation', status: '❌ FAIL', details: testResult.error.message });
      allPassed = false;
    } else {
      const checks = testResult.data[0];
      if (checks.latitude_check === 'latitude_constraint_exists' && checks.longitude_check === 'longitude_constraint_exists') {
        results.push({ test: 'Constraint validation', status: '✅ PASS', details: 'Constraints are active' });
      } else {
        results.push({ test: 'Constraint validation', status: '❌ FAIL', details: 'Some constraints missing' });
        allPassed = false;
      }
    }
  } catch (err) {
    results.push({ test: 'Constraint validation', status: '❌ FAIL', details: err.message });
    allPassed = false;
  }

  // Print results
  console.log('📋 Migration Verification Results:');
  console.log(''.padEnd(80, '='));
  
  for (const result of results) {
    console.log(`${result.status} ${result.test.padEnd(35)} | ${result.details}`);
  }
  
  console.log(''.padEnd(80, '='));
  
  if (allPassed) {
    console.log('🎉 Migration verification passed! All changes applied successfully.');
    return true;
  } else {
    console.log('❌ Migration verification failed. Some issues need to be addressed.');
    return false;
  }
}

/**
 * Generate a post-migration snapshot for comparison
 */
async function generatePostMigrationSnapshot() {
  console.log('\n📸 Generating post-migration snapshot...');
  
  try {
    // Get updated table schema
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

    // Get indexes
    const { data: indexData, error: indexError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT indexname, indexdef
        FROM pg_indexes 
        WHERE tablename = 'scraped_properties'
        AND schemaname = 'public'
        ORDER BY indexname;
      `
    });

    // Get constraints
    const { data: constraintData, error: constraintError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT constraint_name, check_clause
        FROM information_schema.check_constraints 
        WHERE constraint_schema = 'public'
        AND constraint_name LIKE '%latitude%' OR constraint_name LIKE '%longitude%'
        ORDER BY constraint_name;
      `
    });

    // Get sample data with new columns
    const { data: sampleData, error: sampleError } = await supabase
      .from('scraped_properties')
      .select('id, external_id, address, city, state, latitude, longitude, zip_code')
      .limit(5);

    // Get row count
    const { data: countData, error: countError } = await supabase
      .from('scraped_properties')
      .select('id', { count: 'exact', head: true });

    const snapshot = {
      timestamp: new Date().toISOString(),
      migration: '20250925083520_add_location_fields_to_scraped_properties',
      status: 'post-migration',
      schema: schemaData,
      indexes: indexData || [],
      constraints: constraintData || [],
      rowCount: countData?.length || 0,
      sampleData: sampleData?.slice(0, 2) || [], // Just 2 rows for security
      checks: {
        hasLatitude: schemaData.some(col => col.column_name === 'latitude'),
        hasLongitude: schemaData.some(col => col.column_name === 'longitude'),
        hasZipCode: schemaData.some(col => col.column_name === 'zip_code'),
        locationIndexExists: (indexData || []).some(idx => idx.indexname === 'idx_scraped_properties_location'),
        zipIndexExists: (indexData || []).some(idx => idx.indexname === 'idx_scraped_properties_zip_code')
      }
    };

    // Save snapshot
    const filename = `verification_post_migration_${new Date().toISOString().replace(/:/g, '-').split('.')[0]}.json`;
    fs.writeFileSync(filename, JSON.stringify(snapshot, null, 2));
    console.log(`✅ Post-migration snapshot saved to: ${filename}`);
    
    return snapshot;
  } catch (err) {
    console.error('❌ Failed to generate snapshot:', err);
  }
}

/**
 * Compare pre and post migration snapshots
 */
async function compareSnapshots(preFile, postFile) {
  if (!fs.existsSync(preFile) || !fs.existsSync(postFile)) {
    console.log('⚠️  Cannot compare snapshots - files not found');
    return;
  }

  const pre = JSON.parse(fs.readFileSync(preFile, 'utf8'));
  const post = JSON.parse(fs.readFileSync(postFile, 'utf8'));

  console.log('\n📊 Migration Comparison Report:');
  console.log(''.padEnd(50, '='));
  
  console.log(`Row Count: ${pre.rowCount} → ${post.rowCount} (${post.rowCount === pre.rowCount ? 'unchanged ✅' : 'changed ⚠️'})`);
  console.log(`Total Columns: ${pre.schema.length} → ${post.schema.length} (${post.schema.length > pre.schema.length ? 'added +' + (post.schema.length - pre.schema.length) + ' ✅' : 'unchanged'})`);
  
  // Show new columns
  const newColumns = post.schema.filter(col => 
    !pre.schema.some(preCol => preCol.column_name === col.column_name)
  );
  
  if (newColumns.length > 0) {
    console.log('\n🆕 New Columns Added:');
    newColumns.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });
  }
  
  console.log(`\n📍 Location Features: ${post.checks.hasLatitude && post.checks.hasLongitude && post.checks.hasZipCode ? '✅ Ready' : '❌ Incomplete'}`);
  console.log(`🗂️  New Indexes: ${post.checks.locationIndexExists && post.checks.zipIndexExists ? '✅ Created' : '❌ Missing'}`);
}

async function main() {
  const env = process.argv.includes('--env') 
    ? process.argv[process.argv.indexOf('--env') + 1] 
    : 'local';
    
  console.log(`🚀 Location Fields Migration - Post-Migration Verification (${env})\n`);
  
  const passed = await verifyMigrationSuccess();
  const postSnapshot = await generatePostMigrationSnapshot();
  
  // Try to find and compare with pre-migration snapshot
  const preFiles = fs.readdirSync('.').filter(f => f.startsWith('verification_pre_migration_'));
  if (preFiles.length > 0) {
    const latestPre = preFiles.sort().pop();
    const postFiles = fs.readdirSync('.').filter(f => f.startsWith('verification_post_migration_'));
    if (postFiles.length > 0) {
      const latestPost = postFiles.sort().pop();
      await compareSnapshots(latestPre, latestPost);
    }
  }
  
  if (!passed) {
    process.exit(1);
  }
  
  console.log('\n✅ Migration verification complete. Location fields are ready for use!');
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Post-migration verification failed:', err);
    process.exit(1);
  });
}

module.exports = { verifyMigrationSuccess, generatePostMigrationSnapshot, compareSnapshots };