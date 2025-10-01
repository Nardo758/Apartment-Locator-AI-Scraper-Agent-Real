import { NextResponse } from 'next/server'
import { createClient as createServerSupabase } from '@/utils/supabase/server'

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const secret = url.searchParams.get('secret') || ''

    // small guard: require first 8 chars of service role key to match
    const svc = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    if (!svc || svc.slice(0, 8) !== secret) {
      return NextResponse.json({ error: 'invalid or missing secret' }, { status: 401 })
    }

    // create a server-side client with service role key
    const SUPABASE_URL = process.env.SUPABASE_URL || ''
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return NextResponse.json({ error: 'supabase env not configured' }, { status: 500 })
    }

    const sb = (await import('@supabase/supabase-js')).createClient(SUPABASE_URL, SUPABASE_KEY)

    const { data, error } = await sb.from('todos').select('id')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true, count: Array.isArray(data) ? data.length : 0, sample: data?.slice(0, 5) || [] })
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 })
  }
}
