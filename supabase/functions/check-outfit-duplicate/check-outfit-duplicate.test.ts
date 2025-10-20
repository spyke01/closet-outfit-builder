import { assertEquals, assertExists } from "https://deno.land/std@0.168.0/testing/asserts.ts"

// Mock Supabase client for duplicate checking tests
class MockSupabaseClient {
  private mockUserItems: any[] = []
  private mockOutfits: any[] = []
  private mockErrors: any = {}

  constructor() {
    this.setupDefaultData()
  }

  setupDefaultData() {
    this.mockUserItems = [
      { id: 'item-1' },
      { id: 'item-2' },
      { id: 'item-3' },
      { id: 'item-4' }
    ]

    this.mockOutfits = [
      {
        id: 'outfit-1',
        name: 'Classic Look',
        tuck_style: 'Tucked',
        score: 85,
        created_at: '2024-01-01T00:00:00Z',
        outfit_items: [
          { item_id: 'item-1' },
          { item_id: 'item-2' },
          { item_id: 'item-3' }
        ]
      },
      {
        id: 'outfit-2',
        name: 'Casual Friday',
        tuck_style: 'Untucked',
        score: 75,
        created_at: '2024-01-02T00:00:00Z',
        outfit_items: [
          { item_id: 'item-1' },
          { item_id: 'item-4' }
        ]
      },
      {
        id: 'outfit-3',
        name: 'Similar Look',
        tuck_style: 'Tucked',
        score: 80,
        created_at: '2024-01-03T00:00:00Z',
        outfit_items: [
          { item_id: 'item-1' },
          { item_id: 'item-2' }
        ]
      }
    ]
  }

  setMockError(table: string, error: any) {
    this.mockErrors[table] = error
  }

  addMockOutfit(outfit: any) {
    this.mockOutfits.push(outfit)
  }

  auth = {
    getUser: (token: string) => {
      if (token === 'valid-token') {
        return Promise.resolve({
          data: { user: { id: 'test-user-id' } },
          error: null
        })
      }
      return Promise.resolve({
        data: { user: null },
        error: { message: 'Invalid token' }
      })
    }
  }

  from(table: string) {
    if (table === 'wardrobe_items') {
      return {
        select: (columns: string) => ({
          in: (column: string, values: string[]) => ({
            eq: (eqColumn: string, eqValue: any) => ({
              eq: (eqColumn2: string, eqValue2: any) => {
                if (this.mockErrors.wardrobe_items) {
                  return Promise.resolve({
                    data: null,
                    error: this.mockErrors.wardrobe_items
                  })
                }
                
                const validItems = this.mockUserItems.filter(item => values.includes(item.id))
                return Promise.resolve({
                  data: validItems,
                  error: null
                })
              }
            })
          })
        })
      }
    }

    if (table === 'outfits') {
      return {
        select: (columns: string) => ({
          eq: (column: string, value: any) => {
            if (this.mockErrors.outfits) {
              return Promise.resolve({
                data: null,
                error: this.mockErrors.outfits
              })
            }
            
            return Promise.resolve({
              data: this.mockOutfits,
              error: null
            })
          }
        })
      }
    }

    return {
      select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) })
    }
  }
}

function normalizeOutfitComposition(composition: { item_ids: string[], tuck_style?: string }): string {
  const sortedIds = [...composition.item_ids].sort()
  const tuckStyle = composition.tuck_style || 'Untucked'
  return `${sortedIds.join(',')}|${tuckStyle}`
}

function calculateSimilarityScore(outfit1: string[], outfit2: string[]): number {
  const set1 = new Set(outfit1)
  const set2 = new Set(outfit2)
  
  const intersection = new Set([...set1].filter(x => set2.has(x)))
  const union = new Set([...set1, ...set2])
  
  return intersection.size / union.size
}

async function checkOutfitDuplicateFunction(req: Request, mockClient: MockSupabaseClient) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user } } = await mockClient.auth.getUser(token)

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { item_ids, tuck_style, similarity_threshold = 0.8 } = await req.json()

    if (!item_ids || !Array.isArray(item_ids) || item_ids.length === 0) {
      return new Response(
        JSON.stringify({ error: 'item_ids array is required and cannot be empty' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate items
    const { data: userItems, error: itemsError } = await mockClient
      .from('wardrobe_items')
      .select('id')
      .in('id', item_ids)
      .eq('user_id', user.id)
      .eq('active', true)

    if (itemsError) {
      throw new Error(`Failed to validate items: ${itemsError.message}`)
    }

    if (!userItems || userItems.length !== item_ids.length) {
      return new Response(
        JSON.stringify({ error: 'Some items do not exist or do not belong to user' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get existing outfits
    const { data: existingOutfits, error: outfitsError } = await mockClient
      .from('outfits')
      .select('*')
      .eq('user_id', user.id)

    if (outfitsError) {
      throw new Error(`Failed to fetch existing outfits: ${outfitsError.message}`)
    }

    const newComposition = normalizeOutfitComposition({ item_ids, tuck_style })
    const duplicates = []
    const similarOutfits = []

    for (const outfit of existingOutfits || []) {
      const existingItemIds = outfit.outfit_items.map((oi: any) => oi.item_id)
      const existingComposition = normalizeOutfitComposition({
        item_ids: existingItemIds,
        tuck_style: outfit.tuck_style
      })

      // Check for exact duplicate
      if (existingComposition === newComposition) {
        duplicates.push({
          id: outfit.id,
          name: outfit.name,
          score: outfit.score,
          created_at: outfit.created_at,
          match_type: 'exact'
        })
        continue
      }

      // Check for similarity
      const similarity = calculateSimilarityScore(item_ids, existingItemIds)

      if (similarity >= similarity_threshold) {
        similarOutfits.push({
          id: outfit.id,
          name: outfit.name,
          score: outfit.score,
          created_at: outfit.created_at,
          similarity_score: Math.round(similarity * 100) / 100,
          match_type: 'similar'
        })
      }
    }

    return new Response(
      JSON.stringify({
        is_duplicate: duplicates.length > 0,
        has_similar: similarOutfits.length > 0,
        exact_matches: duplicates,
        similar_matches: similarOutfits,
        total_existing_outfits: existingOutfits?.length || 0,
        similarity_threshold,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

Deno.test("check-outfit-duplicate - exact duplicate detection", async () => {
  const mockClient = new MockSupabaseClient()
  
  const req = new Request('https://test.com', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer valid-token',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      item_ids: ['item-1', 'item-2', 'item-3'],
      tuck_style: 'Tucked'
    })
  })

  const response = await checkOutfitDuplicateFunction(req, mockClient)
  const result = await response.json()

  assertEquals(response.status, 200)
  assertEquals(result.is_duplicate, true)
  assertEquals(result.exact_matches.length, 1)
  assertEquals(result.exact_matches[0].id, 'outfit-1')
  assertEquals(result.exact_matches[0].match_type, 'exact')
})

Deno.test("check-outfit-duplicate - no duplicates found", async () => {
  const mockClient = new MockSupabaseClient()
  
  const req = new Request('https://test.com', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer valid-token',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      item_ids: ['item-1', 'item-2', 'item-3', 'item-4'],
      tuck_style: 'Untucked'
    })
  })

  const response = await checkOutfitDuplicateFunction(req, mockClient)
  const result = await response.json()

  assertEquals(response.status, 200)
  assertEquals(result.is_duplicate, false)
  assertEquals(result.exact_matches.length, 0)
})

Deno.test("check-outfit-duplicate - similar outfit detection", async () => {
  const mockClient = new MockSupabaseClient()
  
  const req = new Request('https://test.com', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer valid-token',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      item_ids: ['item-1', 'item-2'],
      tuck_style: 'Tucked',
      similarity_threshold: 0.8
    })
  })

  const response = await checkOutfitDuplicateFunction(req, mockClient)
  const result = await response.json()

  assertEquals(response.status, 200)
  assertEquals(result.has_similar, true)
  assertEquals(result.similar_matches.length >= 1, true)
  assertEquals(result.similar_matches[0].match_type, 'similar')
  assertEquals(result.similar_matches[0].similarity_score >= 0.8, true)
})

Deno.test("check-outfit-duplicate - custom similarity threshold", async () => {
  const mockClient = new MockSupabaseClient()
  
  const req = new Request('https://test.com', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer valid-token',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      item_ids: ['item-1', 'item-2'],
      tuck_style: 'Tucked',
      similarity_threshold: 0.5
    })
  })

  const response = await checkOutfitDuplicateFunction(req, mockClient)
  const result = await response.json()

  assertEquals(response.status, 200)
  assertEquals(result.similarity_threshold, 0.5)
  // Should find more similar matches with lower threshold
  assertEquals(result.similar_matches.length >= 1, true)
})

Deno.test("check-outfit-duplicate - empty item_ids array", async () => {
  const mockClient = new MockSupabaseClient()
  
  const req = new Request('https://test.com', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer valid-token',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      item_ids: []
    })
  })

  const response = await checkOutfitDuplicateFunction(req, mockClient)
  const result = await response.json()

  assertEquals(response.status, 400)
  assertEquals(result.error, 'item_ids array is required and cannot be empty')
})

Deno.test("check-outfit-duplicate - invalid items", async () => {
  const mockClient = new MockSupabaseClient()
  
  const req = new Request('https://test.com', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer valid-token',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      item_ids: ['item-1', 'invalid-item-id']
    })
  })

  const response = await checkOutfitDuplicateFunction(req, mockClient)
  const result = await response.json()

  assertEquals(response.status, 400)
  assertEquals(result.error, 'Some items do not exist or do not belong to user')
})

Deno.test("check-outfit-duplicate - unauthorized access", async () => {
  const mockClient = new MockSupabaseClient()
  
  const req = new Request('https://test.com', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer invalid-token',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      item_ids: ['item-1']
    })
  })

  const response = await checkOutfitDuplicateFunction(req, mockClient)
  const result = await response.json()

  assertEquals(response.status, 401)
  assertEquals(result.error, 'Unauthorized')
})

Deno.test("check-outfit-duplicate - database error handling", async () => {
  const mockClient = new MockSupabaseClient()
  mockClient.setMockError('wardrobe_items', { message: 'Database connection failed' })
  
  const req = new Request('https://test.com', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer valid-token',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      item_ids: ['item-1']
    })
  })

  const response = await checkOutfitDuplicateFunction(req, mockClient)
  const result = await response.json()

  assertEquals(response.status, 500)
  assertExists(result.error)
})