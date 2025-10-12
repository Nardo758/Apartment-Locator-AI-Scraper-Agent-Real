// Script to bulk fix import extensions
const filesToFix = [
  'src/scraper/priority.ts',
  'src/scraper/orchestrator.ts',
  'src/scraper/processResult.ts',
  'src/scraper/market.ts',
  'src/scraper/amenities.ts',
  'src/scraper/propertyType.ts',
  'src/scraper/data-transformer.ts',
  'src/scraper/processor.ts',
  'src/scraper/schemas.ts',
  'src/scraper/observability/metrics.ts',
  'src/services/claude-service-node.ts',
  'src/services/searchService.ts',
  'src/lib/supabase-client.ts',
  'src/lib/typed-upsert.ts'
];

async function fixImports(filePath: string) {
  try {
    let content = await Deno.readTextFile(filePath);

    // Fix relative imports without extensions
    content = content.replace(/from '\.\/([^']+)'/g, "from './$1.ts'");

    // Fix parent directory imports without extensions
    content = content.replace(/from '\.\.\/([^']+)'/g, "from '../$1.ts'");

    // Fix problematic type alias imports
    content = content.replace(
      /from '@types\/database\.types\.ts'/g,
      "from '../types/database.types.ts'",
    );

    await Deno.writeTextFile(filePath, content);
    console.log(`✅ Fixed imports in ${filePath}`);
  } catch (error) {
    console.log(`❌ Failed to fix ${filePath}: ${(error as Error).message}`);
  }
}

async function main() {
  console.log('🔧 Fixing import extensions...\n');
  for (const file of filesToFix) {
    await fixImports(file);
  }
  console.log('\n🎯 Import fixes completed!');
  console.log('Run: /home/ubuntu/.deno/bin/deno check src/');
  console.log('Run: /home/ubuntu/.deno/bin/deno check supabase/functions/');
}

if (import.meta.main) {
  await main();
}
