import { ensureDir } from 'https://deno.land/std@0.177.0/fs/mod.ts'

async function validateFixes() {
  console.log('🔍 Validating fixes...\n')

  // Check if critical files exist
  const criticalFiles = [
    'src/types/database.types.ts',
    'supabase/functions/shared/supabase-client.ts',
    'supabase/functions/shared/error.ts',
    'deno.json'
  ]

  for (const file of criticalFiles) {
    try {
      await Deno.stat(file)
      console.log(`✅ ${file} exists`)
    } catch {
      console.log(`❌ ${file} missing`)
    }
  }

  // Run type checking on specific directories
  console.log('\n📋 Running type checks...')
  
  const commands: Array<{ name: string; cmd: string[] }> = [
    { name: 'Source Code', cmd: ['deno', 'check', 'src/'] },
    { name: 'Supabase Functions', cmd: ['deno', 'check', 'supabase/functions/'] }
  ]

  for (const { name, cmd } of commands) {
    try {
      const process = Deno.run({ cmd, stdout: 'piped', stderr: 'piped' })
      const { code } = await process.status()
      if (code === 0) {
        console.log(`✅ ${name} - Type check passed`)
      } else {
        const rawError = await process.stderrOutput()
        const error = new TextDecoder().decode(rawError)
        const errorCount = (error.match(/error:/g) || []).length
        console.log(`❌ ${name} - ${errorCount} errors found`)
      }
    } catch (error) {
      console.log(`❌ ${name} - Check failed: ${(error as Error).message}`)
    }
  }

  console.log('\n🎯 Next steps:')
  console.log('1. Run: deno check src/ --unstable')
  console.log('2. Run: deno check supabase/functions/')
  console.log('3. Deploy: supabase functions deploy ai-scraper')
  console.log('4. Test: curl -X POST your-function-url')
}

if (import.meta.main) {
  await ensureDir('scripts')
  await validateFixes()
}
