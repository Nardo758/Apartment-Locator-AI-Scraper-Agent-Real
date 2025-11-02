import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54380';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

console.log('\n📊 Final Scraping Summary\n');
console.log('='.repeat(80));

// Get all property sources
const { data: sources } = await supabase
    .from('property_sources')
    .select('*');

// Get all scraped properties
const { data: scraped } = await supabase
    .from('scraped_properties')
    .select('*');

// Categorize sources
const aggregators = ['apartments.com', 'rent.com', 'zillow.com', 'apartmentguide.com', 'forrent.com'];
const scrapedUrls = new Set(scraped.map(p => p.listing_url));

const individualSources = sources.filter(s => !aggregators.some(agg => s.url.toLowerCase().includes(agg)));
const aggregatorSources = sources.filter(s => aggregators.some(agg => s.url.toLowerCase().includes(agg)));

const scrapedIndividual = individualSources.filter(s => scrapedUrls.has(s.url));
const unscrapedIndividual = individualSources.filter(s => !scrapedUrls.has(s.url));
const scrapedAggregator = aggregatorSources.filter(s => scrapedUrls.has(s.url));
const unscrapedAggregator = aggregatorSources.filter(s => !scrapedUrls.has(s.url));

console.log('\n📈 OVERALL STATISTICS\n');
console.log(`   Total URLs in Queue:          ${sources.length}`);
console.log(`   Total Properties Scraped:     ${scraped.length}`);
console.log(`   Successfully Scraped URLs:    ${scrapedUrls.size}/${sources.length} (${Math.round(scrapedUrls.size/sources.length*100)}%)`);

console.log('\n🏢 INDIVIDUAL PROPERTY SITES\n');
console.log(`   Total Individual Sites:       ${individualSources.length}`);
console.log(`   Successfully Scraped:         ${scrapedIndividual.length}/${individualSources.length} (${Math.round(scrapedIndividual.length/individualSources.length*100)}%)`);
console.log(`   Failed/Not Attempted:         ${unscrapedIndividual.length}`);

if (scrapedIndividual.length > 0) {
    console.log('\n   ✅ Successfully Scraped Individual Properties:');
    scrapedIndividual.forEach((s, idx) => {
        console.log(`      ${idx + 1}. ${s.property_name}`);
    });
}

if (unscrapedIndividual.length > 0) {
    console.log('\n   ❌ Failed Individual Properties:');
    unscrapedIndividual.forEach((s, idx) => {
        console.log(`      ${idx + 1}. ${s.property_name}`);
    });
}

console.log('\n📊 AGGREGATOR SITES\n');
console.log(`   Total Aggregator Sites:       ${aggregatorSources.length}`);
console.log(`   Successfully Scraped:         ${scrapedAggregator.length}/${aggregatorSources.length} (${Math.round(scrapedAggregator.length/aggregatorSources.length*100)}%)`);
console.log(`   Failed/Blocked:               ${unscrapedAggregator.length}`);

if (scrapedAggregator.length > 0) {
    console.log('\n   ✅ Successfully Scraped Aggregators:');
    scrapedAggregator.forEach((s, idx) => {
        console.log(`      ${idx + 1}. ${s.property_name}`);
    });
}

if (unscrapedAggregator.length > 0) {
    console.log('\n   ❌ Failed/Blocked Aggregators:');
    unscrapedAggregator.forEach((s, idx) => {
        console.log(`      ${idx + 1}. ${s.property_name} (bot protection)`);
    });
}

// Data quality stats
const withPrice = scraped.filter(p => p.current_price > 0);
const avgPrice = withPrice.length > 0 
    ? Math.round(withPrice.reduce((sum, p) => sum + p.current_price, 0) / withPrice.length)
    : 0;

console.log('\n💰 DATA QUALITY\n');
console.log(`   Properties with Price:        ${withPrice.length}/${scraped.length} (${Math.round(withPrice.length/scraped.length*100)}%)`);
console.log(`   Average Price:                $${avgPrice}/month`);
console.log(`   Price Range:                  $${Math.min(...withPrice.map(p => p.current_price))} - $${Math.max(...withPrice.map(p => p.current_price))}`);

const withBedrooms = scraped.filter(p => p.bedrooms !== null && p.bedrooms !== undefined);
const withBathrooms = scraped.filter(p => p.bathrooms !== null && p.bathrooms !== undefined);
const withSqft = scraped.filter(p => p.square_feet !== null && p.square_feet !== undefined);

console.log(`   Properties with Bedrooms:     ${withBedrooms.length}/${scraped.length} (${Math.round(withBedrooms.length/scraped.length*100)}%)`);
console.log(`   Properties with Bathrooms:    ${withBathrooms.length}/${scraped.length} (${Math.round(withBathrooms.length/scraped.length*100)}%)`);
console.log(`   Properties with Sq Footage:   ${withSqft.length}/${scraped.length} (${Math.round(withSqft.length/scraped.length*100)}%)`);

console.log('\n🚀 RECOMMENDATIONS\n');
console.log('   1. Focus on individual property websites (better success rate)');
console.log('   2. Aggregator sites have strong bot protection');
console.log('   3. Consider using residential proxies for aggregator sites');
console.log('   4. Check if failed individual sites have alternate URLs');

console.log('\n' + '='.repeat(80));
console.log('');
