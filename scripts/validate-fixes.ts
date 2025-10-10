import { ensureDir } from 'https://deno.land/std@0.177.0/fs/mod.ts'

async function validateFixes() {
  console.log('🔍 Validating import and type fixes...\n')

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

  // Run type checking excluding tests
  console.log('\n📋 Running type checks (excluding tests)...')
  try {
    const proc = Deno.run({
      cmd: ['deno', 'check', '--exclude=**/__tests__/**', 'src/'],
      stdout: 'piped',
      stderr: 'piped',
    })
    const { code } = await proc.status()
    const stderr = new TextDecoder().decode(await proc.stderrOutput())
    if (code === 0) {
      console.log('✅ Source code type check passed')
    } else {
      const errorCount = (stderr.match(/error:/g) || []).length
      console.log(`❌ Source code - ${errorCount} errors found`)
      console.log('First few errors:')
      console.log(stderr.split('\n').slice(0, 10).join('\n'))
    }
  } catch (error) {
    console.log(`❌ Type check failed: ${(error as Error).message}`)
  }

  // Check functions
  console.log('\n🔧 Checking functions...')
  try {
    const proc = Deno.run({ cmd: ['deno', 'check', 'supabase/functions/'], stdout: 'piped', stderr: 'piped' })
    const { code } = await proc.status()
    if (code === 0) {
      console.log('✅ Functions type check passed')
    } else {
      console.log('❌ Functions have type errors')
    }
  } catch (error) {
    console.log(`❌ Functions check failed: ${(error as Error).message}`)
  }

  console.log('\n🎯 Next commands to run:')
  console.log('deno check --exclude=**/__tests__/** src/')
  console.log('deno check supabase/functions/')
  console.log('supabase functions deploy ai-scraper')
}

if (import.meta.main) {
  await ensureDir('scripts')
  await validateFixes()
}
