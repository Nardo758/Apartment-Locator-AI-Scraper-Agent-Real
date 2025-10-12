const content = await Deno.readTextFile('src/scraper/index.ts');
const claudeCount = (content.match(/let\s+claudeIntelligence\s*=\s*null/g) || []).length;
console.log(`Found ${claudeCount} claudeIntelligence declarations`);
if (claudeCount > 1) {
  console.log('Need to manually remove duplicate claudeIntelligence-related code');
} else {
  console.log('No duplicates found');
}
