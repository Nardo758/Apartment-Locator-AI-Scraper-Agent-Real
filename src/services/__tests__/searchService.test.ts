import { SearchService } from '../searchService'

describe('SearchService', () => {
  test('basic filters do not throw', async () => {
    // Provide a mock supabase-like client that implements the minimal API
    const mockClient = {
      from: () => ({
        select: () => mockClient.from(),
        eq: () => mockClient.from(),
        gte: () => mockClient.from(),
        lte: () => mockClient.from(),
        contains: () => mockClient.from(),
        order: () => mockClient.from(),
        range: async () => ({ data: [], error: null, count: 0 }),
      }),
    }

    const svc = new SearchService(mockClient as any)
    await expect(svc.searchApartments({ page: 1, pageSize: 1 })).resolves.toEqual({ data: [], total: 0 })
  })
})
