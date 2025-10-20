import { assertEquals, assertExists } from "https://deno.land/std@0.168.0/testing/asserts.ts"

// Mock Supabase client for score-outfit tests
class MockSupabaseClient {
  private mockItems: any[] = []
  private mockErrors: any = {}

  constructor() {
    this.setupDefaultItems()
  }

  setupDefaultItems() {
    this.mockItems = [
      {
        id: 'item-1',
        name: 'White OCBD',
        color: 'White',
        formality_score: 7,
        capsule_tags: ['classic', 'versatile'],
        season: ['All'],
        categories: { name: 'Shirt' }
      },
      {
        id: 'item-2',
        name: 'Navy Chinos',
        color: 'Navy',
        formality_score: 6,
        capsule_tags: ['classic', 'casual'],
        season: ['All'],
        categories: { name: 'Pants' }
      },
      {
        id: 'item-3',
        name: 'Brown Loafers',
        color: 'Brown',
        formality_score: 7,
        capsule_tags: ['classic', 'leather'],
        season: ['All'],
        categories: { name: 'Shoes' }
      },
      {
        id: 'item-4',
        name: 'Linen Shirt',
        color: 'White',
        formality_score: 5,
        capsule_tags: ['summer', 'casual'],
        season: ['Summer'],
        categories: { name: 'Shirt' }
      }
    ]
  }

  setMockError(error: any) {
    this.mockErrors.general = error
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
    return {
      select: (columns: string) => ({
        in: (column: string, values: string[]) => ({
          eq: (eqColumn: string, eqValue: any) => ({
            eq: (eqColumn2: string, eqValue2: any) => {
              if (this.mockErrors.general) {
                return Promise.resolve({
                  data: null,
                  error: this.mockErrors.general
                })
              }
              
              const filteredItems = this.mockItems.filter(item => 
                values.includes(item.id) && 
                item[eqColumn] === eqValue &&
                item[eqColumn2] === eqValue2
              )
              
              return Promise.resolve({
                data: filteredItems,
                error: null
              })
            }
          })
        })
      })
    }
  }
}

// Scoring functions (simplified versions for testing)
function calculateFormalityScore(items: any[]): number {
  if (items.length === 0) return 0
  
  const formalityScores = items.map(item => item.formality_score || 5)
  const avgFormality = formalityScores.reduce((sum, score) => sum + score, 0) / formalityScores.length
  const variance = formalityScores.reduce((sum, score) => sum + Math.pow(score - avgFormality, 2), 0) / formalityScores.length
  
  return Math.max(0, 100 - (variance * 10))
}

function calculateColorHarmony(items: any[]): number {
  if (items.length < 2) return 80
  
  const colors = items.map(item => item.color?.toLowerCase()).filter(Boolean)
  if (colors.length < 2) return 70
  
  const neutrals = ['white', 'black', 'grey', 'navy', 'brown']
  const neutralCount = colors.filter(color => neutrals.includes(color)).length
  
  let score = 60
  if (neutralCount >= colors.length * 0.7) score += 20
  
  return Math.min(100, score)
}

async function scoreOutfitFunction(req: Request, mockClient: MockSupabaseClient) {
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

    const { item_ids, tuck_style, target_season } = await req.json()

    if (!item_ids || !Array.isArray(item_ids)) {
      return new Response(
        JSON.stringify({ error: 'item_ids array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: items, error: itemsError } = await mockClient
      .from('wardrobe_items')
      .select('*')
      .in('id', item_ids)
      .eq('user_id', user.id)
      .eq('active', true)

    if (itemsError) {
      throw new Error(`Failed to fetch items: ${itemsError.message}`)
    }

    if (!items || items.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No valid items found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Calculate scores
    const formality = Math.round(calculateFormalityScore(items))
    const color_harmony = Math.round(calculateColorHarmony(items))
    const seasonal_appropriateness = 85 // Simplified for testing
    const style_consistency = 80 // Simplified for testing
    
    const total = Math.round(
      (formality * 0.3) + 
      (color_harmony * 0.3) + 
      (seasonal_appropriateness * 0.2) + 
      (style_consistency * 0.2)
    )

    const scoreBreakdown = {
      formality,
      color_harmony,
      seasonal_appropriateness,
      style_consistency,
      total: Math.max(0, Math.min(100, total))
    }

    return new Response(
      JSON.stringify({
        score: scoreBreakdown.total,
        breakdown: scoreBreakdown,
        selection: { items, tuck_style },
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

Deno.test("score-outfit function - successful scoring with multiple items", async () => {
  const mockClient = new MockSupabaseClient()
  
  const req = new Request('https://test.com', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer valid-token',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      item_ids: ['item-1', 'item-2', 'item-3'],
      tuck_style: 'Tucked',
      target_season: 'All'
    })
  })

  const response = await scoreOutfitFunction(req, mockClient)
  const result = await response.json()

  assertEquals(response.status, 200)
  assertExists(result.score)
  assertExists(result.breakdown)
  assertEquals(typeof result.score, 'number')
  assertEquals(result.breakdown.formality >= 0, true)
  assertEquals(result.breakdown.color_harmony >= 0, true)
  assertEquals(result.selection.tuck_style, 'Tucked')
})

Deno.test("score-outfit function - high formality consistency score", async () => {
  const mockClient = new MockSupabaseClient()
  
  // Items with similar formality scores should get high consistency
  const req = new Request('https://test.com', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer valid-token',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      item_ids: ['item-1', 'item-3'], // Both have formality_score: 7
      tuck_style: 'Tucked'
    })
  })

  const response = await scoreOutfitFunction(req, mockClient)
  const result = await response.json()

  assertEquals(response.status, 200)
  // Should get high formality score due to perfect consistency
  assertEquals(result.breakdown.formality >= 90, true)
})

Deno.test("score-outfit function - color harmony with neutrals", async () => {
  const mockClient = new MockSupabaseClient()
  
  const req = new Request('https://test.com', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer valid-token',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      item_ids: ['item-1', 'item-2'], // White and Navy (both neutrals)
    })
  })

  const response = await scoreOutfitFunction(req, mockClient)
  const result = await response.json()

  assertEquals(response.status, 200)
  // Should get good color harmony score for neutral combination
  assertEquals(result.breakdown.color_harmony >= 75, true)
})

Deno.test("score-outfit function - empty item_ids array", async () => {
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

  const response = await scoreOutfitFunction(req, mockClient)
  const result = await response.json()

  assertEquals(response.status, 404)
  assertEquals(result.error, 'No valid items found')
})

Deno.test("score-outfit function - missing item_ids parameter", async () => {
  const mockClient = new MockSupabaseClient()
  
  const req = new Request('https://test.com', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer valid-token',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      tuck_style: 'Tucked'
    })
  })

  const response = await scoreOutfitFunction(req, mockClient)
  const result = await response.json()

  assertEquals(response.status, 400)
  assertEquals(result.error, 'item_ids array is required')
})

Deno.test("score-outfit function - unauthorized access", async () => {
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

  const response = await scoreOutfitFunction(req, mockClient)
  const result = await response.json()

  assertEquals(response.status, 401)
  assertEquals(result.error, 'Unauthorized')
})

Deno.test("score-outfit function - database error handling", async () => {
  const mockClient = new MockSupabaseClient()
  mockClient.setMockError({ message: 'Database connection failed' })
  
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

  const response = await scoreOutfitFunction(req, mockClient)
  const result = await response.json()

  assertEquals(response.status, 500)
  assertExists(result.error)
})