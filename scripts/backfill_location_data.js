import { createClient } from '@supabase/supabase-js';
import { backfillZipCodes, generateZipReport } from './backfill_zip_codes.js';
import { geocodePropertiesOnce } from './geocode_properties.js';
import fs from 'fs';
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
 * Get current status of location data population
 */
async function getLocationStatus() {
  try {
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          COUNT(*) as total_properties,
          COUNT(zip_code) as properties_with_zip,
          COUNT(latitude) as properties_with_coordinates,
          COUNT(CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN 1 END) as complete_coordinates,
          ROUND(
            (COUNT(zip_code)::decimal / COUNT(*)) * 100, 2
          ) as zip_completion_rate,
          ROUND(
            (COUNT(CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN 1 END)::decimal / COUNT(*)) * 100, 2
          ) as coordinate_completion_rate
        FROM scraped_properties;
      `
    });

    if (error) {
      console.error('❌ Error getting location status:', error);
      return null;
    }

    return data[0];
  } catch (err) {
    console.error('❌ Error getting location status:', err);
    return null;
  }
}

/**
 * Display current location data status
 */
async function displayStatus() {
  console.log('📊 Location Data Status Report\n');
  
  const status = await getLocationStatus();
  if (!status) {
    console.error('❌ Could not retrieve status');
    return;
  }

  console.log('📍 Current Status:');
  console.log(''.padEnd(50, '='));
  console.log(`Total Properties: ${status.total_properties.toLocaleString()}`);
  console.log(`Properties with ZIP codes: ${status.properties_with_zip.toLocaleString()} (${status.zip_completion_rate}%)`);
  console.log(`Properties with coordinates: ${status.complete_coordinates.toLocaleString()} (${status.coordinate_completion_rate}%)`);
  console.log('');

  // Determine what needs to be done
  const needsZip = status.total_properties - status.properties_with_zip;
  const needsCoords = status.total_properties - status.complete_coordinates;

  if (needsZip > 0) {
    console.log(`🎯 Next Steps: ${needsZip.toLocaleString()} properties need ZIP codes`);
    console.log('   Run: node scripts/backfill_location_data.js zip');
  }
  
  if (needsCoords > 0) {
    console.log(`🗺️  Next Steps: ${needsCoords.toLocaleString()} properties need coordinates`);
    console.log('   Run: node scripts/backfill_location_data.js geocode');
  }
  
  if (needsZip === 0 && needsCoords === 0) {
    console.log('✅ All properties have complete location data!');
  }
  
  console.log('');
  return status;
}

/**
 * Run the complete backfill process step by step
 */
async function runCompleteBackfill() {
  console.log('🚀 Starting Complete Location Data Backfill Process\n');

  // Step 1: Check current status
  console.log('📋 STEP 1: Current Status Check');
  console.log(''.padEnd(40, '-'));
  const initialStatus = await displayStatus();
  if (!initialStatus) return;

  // Step 2: Backfill ZIP codes if needed
  if (initialStatus.zip_completion_rate < 100) {
    console.log('\n📮 STEP 2: ZIP Code Backfill');
    console.log(''.padEnd(40, '-'));
    
    // First, generate a report
    console.log('Generating ZIP extraction report...');
    await generateZipReport();
    
    console.log('\nStarting ZIP code backfill...');
    const zipResults = await backfillZipCodes();
    console.log(`✅ ZIP backfill complete: ${zipResults.updated} properties updated`);
  } else {
    console.log('\n✅ STEP 2: ZIP codes already complete');
  }

  // Step 3: Geocode properties if needed
  if (initialStatus.coordinate_completion_rate < 100) {
    console.log('\n🗺️  STEP 3: Geocoding Coordinates');
    console.log(''.padEnd(40, '-'));
    
    console.log('Starting geocoding process...');
    let geocodeRounds = 0;
    const maxRounds = 10; // Prevent infinite loops
    
    while (geocodeRounds < maxRounds) {
      geocodeRounds++;
      console.log(`\n🔄 Geocoding round ${geocodeRounds}...`);
      
      await geocodePropertiesOnce();
      
      // Check if we still have properties to geocode
      const currentStatus = await getLocationStatus();
      if (!currentStatus || currentStatus.coordinate_completion_rate >= 100) {
        console.log('✅ All properties geocoded!');
        break;
      }
      
      const remaining = currentStatus.total_properties - currentStatus.complete_coordinates;
      console.log(`📊 Remaining to geocode: ${remaining}`);
      
      if (remaining === 0) break;
      
      // Small delay between rounds
      console.log('⏳ Waiting 2 seconds before next round...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  } else {
    console.log('\n✅ STEP 3: Coordinates already complete');
  }

  // Step 4: Final status check
  console.log('\n📊 STEP 4: Final Status Check');
  console.log(''.padEnd(40, '-'));
  const finalStatus = await displayStatus();
  
  // Summary
  console.log('\n🎉 Backfill Process Complete!');
  console.log(''.padEnd(50, '='));
  
  if (finalStatus && initialStatus) {
    const zipImprovement = finalStatus.zip_completion_rate - initialStatus.zip_completion_rate;
    const coordImprovement = finalStatus.coordinate_completion_rate - initialStatus.coordinate_completion_rate;
    
    console.log(`ZIP codes improved: +${zipImprovement.toFixed(2)}%`);
    console.log(`Coordinates improved: +${coordImprovement.toFixed(2)}%`);
  }
  
  return finalStatus;
}

/**
 * Run continuous backfill (useful for ongoing maintenance)
 */
async function runContinuousBackfill() {
  console.log('🔄 Starting Continuous Location Data Backfill\n');
  
  const intervalMinutes = Number(process.env.BACKFILL_INTERVAL_MINUTES || 60);
  console.log(`Running every ${intervalMinutes} minutes. Press Ctrl+C to stop.\n`);

  let iteration = 0;
  
  const runIteration = async () => {
    iteration++;
    console.log(`\n🔄 Iteration ${iteration} - ${new Date().toISOString()}`);
    console.log(''.padEnd(60, '='));
    
    try {
      await runCompleteBackfill();
    } catch (err) {
      console.error(`❌ Error in iteration ${iteration}:`, err);
    }
    
    console.log(`\n⏳ Next run in ${intervalMinutes} minutes...`);
  };

  // Run first iteration immediately
  await runIteration();
  
  // Set up interval for subsequent runs
  const interval = setInterval(runIteration, intervalMinutes * 60 * 1000);
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\n🛑 Stopping continuous backfill...');
    clearInterval(interval);
    process.exit(0);
  });
}

/**
 * Clean up invalid location data
 */
async function cleanupLocationData() {
  console.log('🧹 Cleaning up invalid location data...\n');

  let cleanedCount = 0;

  try {
    // Clean up invalid coordinates (outside valid ranges)
    const { data: invalidCoords, error: coordError } = await supabase.rpc('exec_sql', {
      sql: `
        UPDATE scraped_properties 
        SET latitude = NULL, longitude = NULL
        WHERE (latitude < -90 OR latitude > 90) 
           OR (longitude < -180 OR longitude > 180)
        RETURNING id, external_id;
      `
    });

    if (coordError) {
      console.error('❌ Error cleaning coordinates:', coordError);
    } else {
      console.log(`🗂️  Cleaned ${invalidCoords.length} properties with invalid coordinates`);
      cleanedCount += invalidCoords.length;
    }

    // Clean up invalid ZIP codes
    const { data: invalidZips, error: zipError } = await supabase.rpc('exec_sql', {
      sql: `
        UPDATE scraped_properties 
        SET zip_code = NULL
        WHERE zip_code IS NOT NULL 
          AND NOT zip_code ~ '^\\d{5}(-\\d{4})?$'
        RETURNING id, external_id;
      `
    });

    if (zipError) {
      console.error('❌ Error cleaning ZIP codes:', zipError);
    } else {
      console.log(`📮 Cleaned ${invalidZips.length} properties with invalid ZIP codes`);
      cleanedCount += invalidZips.length;
    }

    console.log(`\n✅ Cleanup complete: ${cleanedCount} records cleaned`);

  } catch (err) {
    console.error('❌ Error during cleanup:', err);
  }
}

async function main() {
  const command = process.argv[2] || 'status';
  
  console.log(`🎯 Location Data Backfill Orchestrator - ${command.toUpperCase()}\n`);
  
  switch (command) {
    case 'status':
      await displayStatus();
      break;
      
    case 'zip':
      console.log('📮 Running ZIP code backfill only...\n');
      await generateZipReport();
      await backfillZipCodes();
      await displayStatus();
      break;
      
    case 'geocode':
      console.log('🗺️  Running geocoding only...\n');
      await geocodePropertiesOnce();
      await displayStatus();
      break;
      
    case 'complete':
      await runCompleteBackfill();
      break;
      
    case 'continuous':
      await runContinuousBackfill();
      break;
      
    case 'cleanup':
      await cleanupLocationData();
      await displayStatus();
      break;
      
    default:
      console.log('📖 Available commands:');
      console.log('  status    - Show current location data status');
      console.log('  zip       - Backfill ZIP codes only');
      console.log('  geocode   - Run geocoding only'); 
      console.log('  complete  - Run complete backfill process');
      console.log('  continuous- Run continuous backfill (good for cron)');
      console.log('  cleanup   - Clean up invalid location data');
      break;
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Location data backfill failed:', err);
    process.exit(1);
  });
}

module.exports = { 
  getLocationStatus, 
  displayStatus, 
  runCompleteBackfill, 
  cleanupLocationData 
};