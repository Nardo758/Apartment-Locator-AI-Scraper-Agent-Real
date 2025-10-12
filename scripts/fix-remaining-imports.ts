// Precision fix for the specific files mentioned
const fixes: Array<{ file: string; patterns: [RegExp, string][] }> = [
  {
    file: 'src/scraper/index.ts',
    patterns: [
      [/"\.\/priority"/g, "'./priority.ts'"],
      [/"\.\/orchestrator"/g, "'./orchestrator.ts'"],
      [/"\.\/processResult"/g, "'./processResult.ts'"],
      [/"\.\/market"/g, "'./market.ts'"],
      [/"\.\/amenities"/g, "'./amenities.ts'"],
      [/"\.\/propertyType"/g, "'./propertyType.ts'"],
      [/from ['"]@types\/database\.types\.ts['"]/g, "from '../types/database.types.ts'"]
    ]
  },
  {
    file: 'src/scraper/orchestrator.ts',
    patterns: [
      [/\.ts\.ts/g, '.ts'],
      [/'\.\.\/types\/database\.types\.ts\.ts'/g, "'../types/database.types.ts'"],
      [/'\.\/costs\.ts\.ts'/g, "'./costs.ts'"],
      [/from ['"]@types\/database\.types\.ts['"]/g, "from '../types/database.types.ts'"]
    ]
  },
  {
    file: 'src/scraper/data-transformer.ts',
    patterns: [
      [/from ['"]types\/supabase['"]/g, "from '../types/database.types.ts'"],
      [/from ['"]types\/frontend['"]/g, "from '../types/frontend.ts'"],
      [/from ['"]@types\/database\.types\.ts['"]/g, "from '../types/database.types.ts'"]
    ]
  },
  {
    file: 'src/scraper/processResult.ts',
    patterns: [
      [/"\.\/market"/g, "'./market.ts'"],
      [/"\.\/amenities"/g, "'./amenities.ts'"],
      [/"\.\/propertyType"/g, "'./propertyType.ts'"],
      [/\.ts\.ts/g, '.ts'],
      [/from ['"]@types\/database\.types\.ts['"]/g, "from '../types/database.types.ts'"]
    ]
  },
  {
    file: 'src/scraper/processor.ts',
    patterns: [
      [/"\.\/orchestrator"/g, "'./orchestrator.ts'"],
      [/"\.\/data-transformer"/g, "'./data-transformer.ts'"],
      [/"\.\.\/schemas\/scraped-property-schema"/g, "'../schemas/scraped-property-schema.ts'"],
      [/"\.\.\/observability\/metrics"/g, "'../observability/metrics.ts'"],
      [/"\.\.\/observability\/server"/g, "'../observability/server.ts'"],
      [/\.ts\.ts/g, '.ts']
    ]
  },
  {
    file: 'src/services/base-service.ts',
    patterns: [
      [/from ['"]@types\/database\.types\.ts['"]/g, "from '../types/database.types.ts'"],
      [/from ['"]\.\.\/shared\/error['"]/g, "from '../shared/error.ts'"]
    ]
  },
  {
    file: 'src/scraper/frontend-integration.ts',
    patterns: [
      [/from ['"]@types\/database\.types\.ts['"]/g, "from '../types/database.types.ts'"],
      [/from ['"]@shared\/error\.ts['"]/g, "from '../shared/error.ts'"],
      [/from ['"]@lib\/supabase-client\.ts['"]/g, "from '../lib/supabase-client.ts'"],
      [/from ['"]@lib\/typed-upsert\.ts['"]/g, "from '../lib/typed-upsert.ts'"]
    ]
  }
];

async function fixFile(filePath: string, patterns: [RegExp, string][]) {
  try {
    let content = await Deno.readTextFile(filePath);
    let changed = false;
    for (const [pattern, replacement] of patterns) {
      const newContent = content.replace(pattern, replacement);
      if (newContent !== content) {
        changed = true;
        content = newContent;
      }
    }
    if (changed) {
      await Deno.writeTextFile(filePath, content);
      console.log(`✅ Fixed imports in ${filePath}`);
    } else {
      console.log(`ℹ️  No changes needed for ${filePath}`);
    }
  } catch (error) {
    console.log(`❌ Failed to fix ${filePath}: ${(error as Error).message}`);
  }
}

async function main() {
  console.log('🔧 Fixing remaining import issues...\n');
  for (const { file, patterns } of fixes) {
    await fixFile(file, patterns);
  }
  console.log('\n🎯 Manual fixes needed for frontend-integration.ts:');
  console.log('1. Remove .select().single() after typedUpsert calls');
  console.log('2. Replace SharedScrapedProperty with local interface');
  console.log('\nRun type checks again:');
  console.log('/home/ubuntu/.deno/bin/deno check src/');
  console.log('/home/ubuntu/.deno/bin/deno check supabase/functions/');
}

if (import.meta.main) {
  await main();
}
