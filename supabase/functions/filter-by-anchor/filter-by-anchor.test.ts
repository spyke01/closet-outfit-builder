import { assertEquals, assertExists } from "https://deno.land/std@0.168.0/testing/asserts.ts"

// Mock Supabase client for filter-by-anchor tests
class MockSupabaseClient {
  private mockAnchorItem: any = null
  private mockCandidateItems: any[] = []
  private mockErrors: any = {}

  constructor() {
    this.setupDefaultData()
  }

  setupDefaultData() {
    this.mockAnchorItem = {
      id: 'anchor-1',
      name: 'Navy Blazer',
      color: 'Navy',
      formality_score: 8,
      capsule_tags: ['classic', 'formal'],
      season: ['All'],
      categories: { name: 'Jacket/Overshirt' }
    }

    this.mockCandidateItems = [
      {
        id: 'candidate-1',
        name: 'White OCBD',
        color: 'White',
        formality_score: 7,
        capsule_tags: ['classic', 'versatile'],
        season: ['All'],
        categories: { name: 'Shirt' }
      },
      {
        id: 'candidate-2',
        name: 'Khaki Chinos',
        color: 'Khaki',
        formality_score: 6,
        capsule_tags: ['casual', 'versatile'],
        season: ['All'],
        categories: { name: 'Pants' }
      },
      {
        id: 'candidate-3',
        name: 'Brown Loafers',
        color: 'Brown',
        formality_score: 8,
        capsule_tags: ['classic', 'leather'],
        season: ['All'],
        categories: { name: 'Shoes' }
      },
      {
        id: 'candidate-4',
        name: 'Casual Sneakers',
        color: 'White',
        formality_score: 3,
        capsule_tags: ['casual', 'sporty'],
        season: ['All'],
        categories: { name: 'Shoes' }
      },
      {
        id: 'candidate-5',
        name: 'Summer Linen Shirt',
        color: 'Light Blue',
        formality_score: 5,
        capsule_tags: ['summer', 'casual'],
        season: ['Summer'],
        categories: { name: 'Shirt' }
      }
    ]
  }

  setMockError(table: string, error: any) {
    this.mockErrors[table] = error
  }

  setMockAnchorItem(item: any) {
    this.mockAnchorItem = item
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
          eq: (column: string, value: any) => ({
            eq: (eqColumn2: string, eqValue2: any) => ({
              eq: (eqColumn3: string, eqValue3: any) => ({
                single: () => {
                  if (this.mockErrors.anchor_item) {
                    return Promise.resolve({
                      data: null,
                      error: this.mockErrors.anchor_item
                    })
                  }
                  return Promise.resolve({
                    data: this.mockAnchorItem,
                    error: null
                  })
                },
                neq: (neqColumn: string, neqValue: any) => ({
                  in: (inColumn: string, inValues: string[]) => {
                    if (this.mockErrors.candidates) {
                      return Promise.resolve({
                        data: null,
                        error: this.mockErrors.candidates
                      })
                    }
                    
                    let filteredItems = this.mockCandidateItems.filter(item => item.id !== neqValue)
                    
                    if (inValues && inValues.length > 0) {
                      filteredItems = filteredItems.filter(item => 
                        inValues.includes(item.categories.name)
                      )
                    }
                    
                    return Promise.resolve({
                      data: filteredItems,
                      error: null
                    })
                  }
                })
              })
            })
          })
        })
      }
    }

    return {
      select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) })
    }
  }
}

function calculateCompatibility(anchorItem: any, candidateItem: any): { score: number; reasons: string[] } {
  let score = 50
  const reasons: string[] = []

  if (anchorItem.id === candidateItem.id) {
    return { score: 0, reasons: ['Same item'] }
  }

  if (anchorItem.category_name === candidateItem.category_name) {
    return { score: 0, reasons: ['Same category'] }
  }

  // Formality compatibility
  if (anchorItem.formality_score && candidateItem.formality_score) {
    const formalityDiff = Math.abs(anchorItem.formality_score - candidateItem.formality_score)
    
    if (formalityDiff <= 1) {
      score += 25
      reasons.push('Perfect formality match')
    } else if (formalityDiff <= 2) {
      score += 15
      reasons.push('Good formality match')
    } else if (formalityDiff <= 3) {
      score += 5
      reasons.push('Acceptable formality match')
    } else {
      score -= 10
      reasons.push('Formality mismatch')
    }
  }

  // Color compatibility
  if (anchorItem.color && candidateItem.color) {
    const neutrals = ['white', 'black', 'grey', 'navy', 'brown']
    const anchorColor = anchorItem.color.toLowerCase()
    const candidateColor = candidateItem.color.toLowerCase()
    
    if (neutrals.includes(anchorColor) && neutrals.includes(candidateColor)) {
      score += 20
      reasons.push('Neutral color harmony')
    } else if (anchorColor === 'white' || candidateColor === 'white') {
      score += 12
      reasons.push('White versatility')
    }
  }

  return { 
    score: Math.max(0, Math.min(100, score)), 
    reasons: reasons.length > 0 ? reasons : ['Basic compatibility'] 
  }
}

async function filterByAnchorFunction(req: Request, mockClient: MockSupabaseClient) {
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

    const { 
      anchor_item_id, 
      target_categories, 
      min_compatibility_score = 60,
      limit = 50 
    } = await req.json()

    if (!anchor_item_id) {
      return new Response(
        JSON.stringify({ error: 'anchor_item_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch anchor item
    const { data: anchorItems, error: anchorError } = await mockClient
      .from('wardrobe_items')
      .select('*')
      .eq('id', anchor_item_id)
      .eq('user_id', user.id)
      .eq('active', true)
      .single()

    if (anchorError || !anchorItems) {
      return new Response(
        JSON.stringify({ error: 'Anchor item not found or does not belong to user' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const anchorItem = {
      ...anchorItems,
      category_name: anchorItems.categories.name
    }

    // Fetch candidate items
    const { data: candidateItems, error: candidatesError } = await mockClient
      .from('wardrobe_items')
      .select('*')
      .eq('user_id', user.id)
      .eq('active', true)
      .neq('id', anchor_item_id)
      .in('categories.name', target_categories || [])

    if (candidatesError) {
      throw new Error(`Failed to fetch candidate items: ${candidatesError.message}`)
    }

    if (!candidateItems || candidateItems.length === 0) {
      return new Response(
        JSON.stringify({
          anchor_item: anchorItem,
          compatible_items: [],
          total_candidates: 0,
          min_compatibility_score,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Calculate compatibility scores
    const compatibilityScores = candidateItems
      .map(item => {
        const candidateItem = {
          ...item,
          category_name: item.categories.name
        }

        const { score, reasons } = calculateCompatibility(anchorItem, candidateItem)
        
        return {
          item: candidateItem,
          compatibility_score: score,
          reasons
        }
      })
      .filter(result => result.compatibility_score >= min_compatibility_score)
      .sort((a, b) => b.compatibility_score - a.compatibility_score)
      .slice(0, limit)

    return new Response(
      JSON.stringify({
        anchor_item: anchorItem,
        compatible_items: compatibilityScores,
        total_candidates: candidateItems.length,
        filtered_count: compatibilityScores.length,
        min_compatibility_score,
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

Deno.test("filter-by-anchor - successful filtering with high compatibility", async () => {
  const mockClient = new MockSupabaseClient()
  
  const req = new Request('https://test.com', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer valid-token',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      anchor_item_id: 'anchor-1',
      target_categories: ['Shirt', 'Pants', 'Shoes'],
      min_compatibility_score: 60
    })
  })

  const response = await filterByAnchorFunction(req, mockClient)
  const result = await response.json()

  assertEquals(response.status, 200)
  assertExists(result.anchor_item)
  assertEquals(result.anchor_item.id, 'anchor-1')
  assertEquals(Array.isArray(result.compatible_items), true)
  assertEquals(result.total_candidates >= 0, true)
  assertEquals(result.min_compatibility_score, 60)
})

Deno.test("filter-by-anchor - formality matching prioritization", async () => {
  const mockClient = new MockSupabaseClient()
  
  const req = new Request('https://test.com', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer valid-token',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      anchor_item_id: 'anchor-1',
      target_categories: ['Shoes'],
      min_compatibility_score: 50
    })
  })

  const response = await filterByAnchorFunction(req, mockClient)
  const result = await response.json()

  assertEquals(response.status, 200)
  
  // Brown Loafers (formality 8) should score higher than Casual Sneakers (formality 3)
  // when paired with Navy Blazer (formality 8)
  const brownLoafers = result.compatible_items.find((item: any) => item.item.name === 'Brown Loafers')
  const casualSneakers = result.compatible_items.find((item: any) => item.item.name === 'Casual Sneakers')
  
  if (brownLoafers && casualSneakers) {
    assertEquals(brownLoafers.compatibility_score > casualSneakers.compatibility_score, true)
  }
})

Deno.test("filter-by-anchor - category filtering", async () => {
  const mockClient = new MockSupabaseClient()
  
  const req = new Request('https://test.com', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer valid-token',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      anchor_item_id: 'anchor-1',
      target_categories: ['Shirt'], // Only shirts
      min_compatibility_score: 50
    })
  })

  const response = await filterByAnchorFunction(req, mockClient)
  const result = await response.json()

  assertEquals(response.status, 200)
  
  // All returned items should be shirts
  for (const compatibleItem of result.compatible_items) {
    assertEquals(compatibleItem.item.categories.name, 'Shirt')
  }
})

Deno.test("filter-by-anchor - minimum compatibility score filtering", async () => {
  const mockClient = new MockSupabaseClient()
  
  const req = new Request('https://test.com', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer valid-token',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      anchor_item_id: 'anchor-1',
      target_categories: ['Shirt', 'Pants', 'Shoes'],
      min_compatibility_score: 80 // High threshold
    })
  })

  const response = await filterByAnchorFunction(req, mockClient)
  const result = await response.json()

  assertEquals(response.status, 200)
  
  // All returned items should meet the minimum score
  for (const compatibleItem of result.compatible_items) {
    assertEquals(compatibleItem.compatibility_score >= 80, true)
  }
})

Deno.test("filter-by-anchor - missing anchor_item_id", async () => {
  const mockClient = new MockSupabaseClient()
  
  const req = new Request('https://test.com', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer valid-token',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      target_categories: ['Shirt']
    })
  })

  const response = await filterByAnchorFunction(req, mockClient)
  const result = await response.json()

  assertEquals(response.status, 400)
  assertEquals(result.error, 'anchor_item_id is required')
})

Deno.test("filter-by-anchor - anchor item not found", async () => {
  const mockClient = new MockSupabaseClient()
  mockClient.setMockError('anchor_item', { message: 'Item not found' })
  
  const req = new Request('https://test.com', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer valid-token',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      anchor_item_id: 'non-existent-id'
    })
  })

  const response = await filterByAnchorFunction(req, mockClient)
  const result = await response.json()

  assertEquals(response.status, 404)
  assertEquals(result.error, 'Anchor item not found or does not belong to user')
})

Deno.test("filter-by-anchor - unauthorized access", async () => {
  const mockClient = new MockSupabaseClient()
  
  const req = new Request('https://test.com', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer invalid-token',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      anchor_item_id: 'anchor-1'
    })
  })

  const response = await filterByAnchorFunction(req, mockClient)
  const result = await response.json()

  assertEquals(response.status, 401)
  assertEquals(result.error, 'Unauthorized')
})

Deno.test("filter-by-anchor - no compatible items found", async () => {
  const mockClient = new MockSupabaseClient()
  
  const req = new Request('https://test.com', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer valid-token',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      anchor_item_id: 'anchor-1',
      target_categories: ['Shirt'],
      min_compatibility_score: 95 // Very high threshold
    })
  })

  const response = await filterByAnchorFunction(req, mockClient)
  const result = await response.json()

  assertEquals(response.status, 200)
  assertEquals(result.compatible_items.length, 0)
  assertEquals(result.filtered_count, 0)
})