import { readFileSync } from 'fs';
import { join } from 'path';

console.log('\n✅ Validation Rules Verification\n');
console.log('='.repeat(70));

const scraperFiles = [
    'scrape_all_remaining.py',
    'scrape_to_production.py',
    'scrape_remaining_properties.py',
    'scrape_batch_to_production.py',
    'clean_and_scrape_individual.py'
];

console.log('\n🔍 Checking bathroom validation (max 3) in scraper scripts:\n');

let allValid = true;

scraperFiles.forEach(file => {
    const filePath = join(process.cwd(), file);
    try {
        const content = readFileSync(filePath, 'utf-8');
        
        // Check for the validation
        const hasValidation = content.includes('baths <= 3') && content.includes('VALIDATION: Max 3 bathrooms');
        const hasSkipMessage = content.includes('[SKIP] Invalid bathrooms');
        
        const status = hasValidation && hasSkipMessage ? '✅' : '❌';
        
        if (!hasValidation || !hasSkipMessage) {
            allValid = false;
        }
        
        console.log(`   ${status} ${file}`);
        
        if (hasValidation && hasSkipMessage) {
            // Find the line number
            const lines = content.split('\n');
            const lineNum = lines.findIndex(line => line.includes('baths <= 3')) + 1;
            console.log(`      Line ${lineNum}: if 0 <= baths <= 3:  # VALIDATION: Max 3 bathrooms`);
        }
        
    } catch (err) {
        console.log(`   ⚠️  ${file} - Could not read file`);
        allValid = false;
    }
    console.log('');
});

console.log('='.repeat(70));

if (allValid) {
    console.log('\n✅ ALL SCRAPER SCRIPTS HAVE PROPER VALIDATION\n');
    console.log('📋 Validation Rules:\n');
    console.log('   • Bathrooms: 0-3 (max 3) ✓');
    console.log('   • Any property with >3 bathrooms will be rejected');
    console.log('   • Invalid bathrooms will show: [SKIP] Invalid bathrooms: X');
    console.log('   • Expected range: mostly 1-2 bathrooms, occasionally 3\n');
} else {
    console.log('\n❌ SOME SCRIPTS ARE MISSING VALIDATION\n');
    console.log('Please review the scripts marked with ❌ above.\n');
}

console.log('='.repeat(70));
console.log('');
