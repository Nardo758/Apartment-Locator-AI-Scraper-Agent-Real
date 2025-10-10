import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { getServiceClient } from '../shared/supabase-client.ts'
import { errMsg, ValidationError } from '../shared/error.ts'

interface ScrapeRequest {
  url: string
  htmlContent?: string
  testMode?: boolean
  priority?: number
}

interface ScrapeResponse {
  status: 'success' | 'error'
  data?: unknown
  error?: string
  jobId?: string
}

async function validateScrapeRequest(request: ScrapeRequest): Promise<void> {
  if (!request.url && !request.htmlContent) {
    throw new ValidationError('Either url or htmlContent must be provided')
  }
  if (request.url && !request.url.startsWith('http')) {
    throw new ValidationError('Invalid URL format')
  }
  if (request.htmlContent && request.htmlContent.length > 500000) {
    throw new ValidationError('HTML content too large')
  }
}

async function createScrapingJob(request: ScrapeRequest): Promise<string> {
  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from('scraping_jobs')
    .insert({
      url: request.url || 'direct_html_input',
      status: 'pending',
      priority: request.priority || 0,
    })
    .select('id')
    .single()
  if (error) throw new Error(`Failed to create scraping job: ${error.message}`)
  return (data as { id: string }).id
}

async function processScrapingJob(jobId: string, request: ScrapeRequest): Promise<unknown> {
  // TODO: wire in existing AI scraping logic; placeholder result
  const result = {
    property_name: 'Sample Property',
    address: '123 Main St',
    city: 'Sample City',
    state: 'CA',
    price: 2500,
    bedrooms: 2,
    bathrooms: 1,
    square_feet: 1000,
  }

  const supabase = getServiceClient()
  await supabase
    .from('scraping_jobs')
    .update({ status: 'completed', completed_at: new Date().toISOString(), results: result })
    .eq('id', jobId)

  return result
}

serve(async (req: Request) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }

  if (req.method === 'OPTIONS') return new Response(null, { headers })
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers })
  }

  try {
    const request: ScrapeRequest = await req.json()
    await validateScrapeRequest(request)

    if (request.testMode) {
      return new Response(
        JSON.stringify({ status: 'success', data: { test: true, message: 'Test mode active' } }),
        { headers },
      )
    }

    const jobId = await createScrapingJob(request)
    const result = await processScrapingJob(jobId, request)

    const response: ScrapeResponse = { status: 'success', data: result, jobId }
    return new Response(JSON.stringify(response), { headers })
  } catch (error) {
    const response: ScrapeResponse = { status: 'error', error: errMsg(error) }
    return new Response(JSON.stringify(response), {
      status: error instanceof ValidationError ? 400 : 500,
      headers,
    })
  }
})
