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

const batchSize = Number(process.env.BATCH_SIZE || 100);
const dryRun = !!process.env.DRY_RUN;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { 
  auth: { persistSession: false } 
});

/**
 * Extract ZIP codes from existing address strings
 * Supports various US ZIP code formats: 12345, 12345-6789
 */
function extractZipFromAddress(address) {
  if (!address || typeof address !== 'string') return null;
  
  // Patterns for US ZIP codes
  const zipPatterns = [
    /\b(\d{5}-\d{4})\b/,  // 12345-6789 format
    /\b(\d{5})\b/,        // 12345 format
  ];
  
  for (const pattern of zipPatterns) {
    const match = address.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  return null;
}

/**
 * Backfill ZIP codes from existing address data
 */
async function backfillZipCodes() {
  console.log(`🎯 Starting ZIP code backfill process...`);
  console.log(`📊 Batch size: ${batchSize}, Dry run: ${dryRun}\n`);

  let totalProcessed = 0;
  let totalUpdated = 0;
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    try {
      console.log(`📖 Fetching batch starting at offset ${offset}...`);
      
      // Get properties without ZIP codes
      const { data: properties, error } = await supabase
        .from('scraped_properties')
        .select('id, external_id, address, city, state, zip_code')
        .is('zip_code', null)
        .range(offset, offset + batchSize - 1)
        .order('id');

      if (error) {
        console.error('❌ Error fetching properties:', error);
        break;
      }

      if (!properties || properties.length === 0) {
        console.log('✅ No more properties to process');
        hasMore = false;
        break;
      }

      console.log(`🔍 Processing ${properties.length} properties...`);
      let batchUpdated = 0;

      for (const property of properties) {
        totalProcessed++;
        
        // Try to extract ZIP from address
        const extractedZip = extractZipFromAddress(property.address);
        
        if (extractedZip) {
          console.log(`📍 Property ${property.external_id}: Found ZIP ${extractedZip} in "${property.address}"`);
          
          if (!dryRun) {
            const { error: updateError } = await supabase
              .from('scraped_properties')
              .update({ zip_code: extractedZip })
              .eq('id', property.id);

            if (updateError) {
              console.error(`❌ Failed to update property ${property.id}:`, updateError);
            } else {
              batchUpdated++;
              totalUpdated++;
            }
          } else {
            batchUpdated++;
            totalUpdated++;
          }
        } else {
          console.log(`⚪ Property ${property.external_id}: No ZIP found in "${property.address}"`);
        }
      }

      console.log(`✅ Batch complete: ${batchUpdated} properties updated\n`);
      
      // Move to next batch
      offset += batchSize;
      
      // Prevent infinite loop if we get the same batch size every time
      if (properties.length < batchSize) {
        hasMore = false;
      }
      
    } catch (err) {
      console.error(`❌ Error processing batch at offset ${offset}:`, err);
      break;
    }
  }

  console.log('📈 Backfill Summary:');
  console.log(''.padEnd(40, '='));
  console.log(`Properties processed: ${totalProcessed}`);
  console.log(`Properties updated: ${totalUpdated}`);
  console.log(`Success rate: ${totalProcessed > 0 ? Math.round((totalUpdated / totalProcessed) * 100) : 0}%`);
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes made)' : 'LIVE UPDATE'}`);
  
  return { processed: totalProcessed, updated: totalUpdated };
}

/**
 * Generate a report of ZIP code extraction potential
 */
async function generateZipReport() {
  console.log('📊 Generating ZIP code extraction report...\n');

  try {
    // Get a sample of addresses without ZIP codes
    const { data: sampleProperties, error } = await supabase
      .from('scraped_properties')
      .select('id, external_id, address, city, state, zip_code')
      .is('zip_code', null)
      .limit(100);

    if (error) {
      console.error('❌ Error fetching sample properties:', error);
      return;
    }

    if (!sampleProperties || sampleProperties.length === 0) {
      console.log('✅ All properties already have ZIP codes!');
      return;
    }

    let extractable = 0;
    const samples = [];

    console.log('🔍 Analyzing sample addresses:\n');

    for (const property of sampleProperties.slice(0, 10)) {
      const extractedZip = extractZipFromAddress(property.address);
      
      if (extractedZip) {
        extractable++;
        samples.push({
          external_id: property.external_id,
          address: property.address,
          extracted_zip: extractedZip,
          status: '✅ Extractable'
        });
      } else {
        samples.push({
          external_id: property.external_id,
          address: property.address,
          extracted_zip: null,
          status: '❌ Not extractable'
        });
      }
    }

    // Display sample results
    samples.forEach(sample => {
      console.log(`${sample.status} ${sample.external_id}`);
      console.log(`  Address: ${sample.address}`);
      if (sample.extracted_zip) {
        console.log(`  Extracted ZIP: ${sample.extracted_zip}`);
      }
      console.log('');
    });

    const estimatedSuccess = Math.round((extractable / samples.length) * 100);

    console.log('📈 Report Summary:');
    console.log(''.padEnd(40, '='));
    console.log(`Sample size analyzed: ${samples.length}`);
    console.log(`ZIP codes extractable: ${extractable}`);
    console.log(`Estimated success rate: ${estimatedSuccess}%`);
    console.log(`Total properties needing ZIP codes: ${sampleProperties.length}`);
    console.log(`Estimated successful extractions: ~${Math.round((sampleProperties.length * estimatedSuccess) / 100)}`);

  } catch (err) {
    console.error('❌ Error generating report:', err);
  }
}

/**
 * Validate extracted ZIP codes
 */
async function validateZipCodes() {
  console.log('🔍 Validating extracted ZIP codes...\n');

  try {
    const { data: properties, error } = await supabase
      .from('scraped_properties')
      .select('id, external_id, zip_code, city, state')
      .not('zip_code', 'is', null)
      .limit(1000);

    if (error) {
      console.error('❌ Error fetching properties with ZIP codes:', error);
      return;
    }

    let valid = 0;
    let invalid = 0;
    const issues = [];

    for (const property of properties) {
      // Basic ZIP code validation
      const isValidFormat = /^\d{5}(-\d{4})?$/.test(property.zip_code);
      
      if (isValidFormat) {
        valid++;
      } else {
        invalid++;
        issues.push({
          id: property.id,
          external_id: property.external_id,
          zip_code: property.zip_code,
          issue: 'Invalid format'
        });
      }
    }

    console.log('✅ Validation Results:');
    console.log(''.padEnd(30, '='));
    console.log(`Valid ZIP codes: ${valid}`);
    console.log(`Invalid ZIP codes: ${invalid}`);
    console.log(`Validation rate: ${Math.round((valid / (valid + invalid)) * 100)}%`);

    if (issues.length > 0) {
      console.log('\n⚠️  Issues found:');
      issues.slice(0, 10).forEach(issue => {
        console.log(`  ${issue.external_id}: "${issue.zip_code}" - ${issue.issue}`);
      });
      
      if (issues.length > 10) {
        console.log(`  ... and ${issues.length - 10} more issues`);
      }
    }

  } catch (err) {
    console.error('❌ Error validating ZIP codes:', err);
  }
}

async function main() {
  const command = process.argv[2] || 'backfill';
  
  console.log(`🚀 ZIP Code Backfill Tool - ${command.toUpperCase()}\n`);
  
  switch (command) {
    case 'report':
      await generateZipReport();
      break;
    case 'validate':
      await validateZipCodes();
      break;
    case 'backfill':
    default:
      await backfillZipCodes();
      break;
  }
  
  console.log('\n✅ ZIP code processing complete!');
}

if (require.main === module) {
  main().catch((err) => {
    console.error('ZIP code backfill failed:', err);
    process.exit(1);
  });
}

module.exports = { 
  backfillZipCodes, 
  generateZipReport, 
  validateZipCodes, 
  extractZipFromAddress 
};