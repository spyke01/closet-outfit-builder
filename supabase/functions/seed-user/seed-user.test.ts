import { assertEquals, assertExists } from "https://deno.land/std@0.168.0/testing/asserts.ts"

// Mock Supabase client
class MockSupabaseClient {
  private mockData: any = {}
  private mockErrors: any = {}

  constructor() {
    this.reset()
  }

  reset() {
    this.mockData = {
      categories: [],
      wardrobe_items: []
    }
    this.mockErrors = {}
  }

  setMockError(table: string, operation: string, error: any) {
    if (!this.mockErrors[table]) this.mockErrors[table] = {}
    this.mockErrors[table][operation] = error
  }

  setMockData(table: string, data: any[]) {
    this.mockData[table] = data
  }

  auth = {
    getUser: (token: string) => {
      if (token === 'valid-token') {
        return Promise.resolve({
          data: { user: { id: 'test-user-id', email: 'test@example.com' } },
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
        eq: (column: string, value: any) => ({
          limit: (count: number) => {
            if (this.mockErrors[table]?.select) {
              return Promise.resolve({
                data: null,
                error: this.mockErrors[table].select
              })
            }
            return Promise.resolve({
              data: this.mockData[table].filter((item: any) => item[column] === value).slice(0, count),
              error: null
            })
          }
        })
      }),
      insert: (data: any[]) => ({
        select: () => {
          if (this.mockErrors[table]?.insert) {
            return Promise.resolve({
              data: null,
              error: this.mockErrors[table].insert
            })
          }
          
          const insertedData = data.map((item, index) => ({
            ...item,
            id: `${table}-${index + 1}`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }))
          
          this.mockData[table].push(...insertedData)
          
          return Promise.resolve({
            data: insertedData,
            error: null
          })
        }
      })
    }
  }
}

// Mock environment variables
const originalEnv = Deno.env.toObject()

function setMockEnv() {
  Deno.env.set('SUPABASE_URL', 'https://test.supabase.co')
  Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
}

function restoreEnv() {
  for (const [key, value] of Object.entries(originalEnv)) {
    Deno.env.set(key, value)
  }
}

// Import the function (this would need to be adjusted based on actual module structure)
// For testing purposes, we'll simulate the main logic
async function seedUserFunction(req: Request, mockClient: MockSupabaseClient) {
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

    // Check if user already has categories
    const { data: existingCategories } = await mockClient
      .from('categories')
      .select('id')
      .eq('user_id', user.id)
      .limit(1)

    if (existingCategories && existingCategories.length > 0) {
      return new Response(
        JSON.stringify({ message: 'User already seeded', skipped: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Insert default categories
    const defaultCategories = [
      { name: 'Jacket/Overshirt', is_anchor_item: true, display_order: 1 },
      { name: 'Shirt', is_anchor_item: true, display_order: 2 },
      { name: 'Pants', is_anchor_item: true, display_order: 3 },
      { name: 'Shoes', is_anchor_item: true, display_order: 4 },
    ]

    const { data: categories, error: categoriesError } = await mockClient
      .from('categories')
      .insert(defaultCategories.map(cat => ({ ...cat, user_id: user.id })))
      .select()

    if (categoriesError) {
      throw new Error(`Failed to create categories: ${categoriesError.message}`)
    }

    // Insert default wardrobe items
    const defaultItems = [
      { name: 'White OCBD', category_name: 'Shirt', color: 'White', formality_score: 7 },
      { name: 'Navy Chinos', category_name: 'Pants', color: 'Navy', formality_score: 6 },
    ]

    const categoryMap = new Map<string, string>()
    categories.forEach((cat: any) => {
      categoryMap.set(cat.name, cat.id)
    })

    const wardrobeItemsToInsert = defaultItems.map(item => {
      const categoryId = categoryMap.get(item.category_name)
      const { category_name, ...itemData } = item
      return {
        ...itemData,
        user_id: user.id,
        category_id: categoryId,
        active: true,
      }
    })

    const { data: wardrobeItems, error: itemsError } = await mockClient
      .from('wardrobe_items')
      .insert(wardrobeItemsToInsert)
      .select()

    if (itemsError) {
      throw new Error(`Failed to create wardrobe items: ${itemsError.message}`)
    }

    return new Response(
      JSON.stringify({
        message: 'User seeded successfully',
        categories: categories.length,
        wardrobe_items: wardrobeItems.length,
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

Deno.test("seed-user function - successful seeding for new user", async () => {
  setMockEnv()
  const mockClient = new MockSupabaseClient()
  
  const req = new Request('https://test.com', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer valid-token',
      'Content-Type': 'application/json'
    }
  })

  const response = await seedUserFunction(req, mockClient)
  const result = await response.json()

  assertEquals(response.status, 200)
  assertEquals(result.message, 'User seeded successfully')
  assertEquals(result.categories, 4)
  assertEquals(result.wardrobe_items, 2)
  
  restoreEnv()
})

Deno.test("seed-user function - skip seeding for existing user", async () => {
  setMockEnv()
  const mockClient = new MockSupabaseClient()
  
  // Pre-populate with existing categories
  mockClient.setMockData('categories', [
    { id: 'existing-cat-1', user_id: 'test-user-id', name: 'Shirt' }
  ])
  
  const req = new Request('https://test.com', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer valid-token',
      'Content-Type': 'application/json'
    }
  })

  const response = await seedUserFunction(req, mockClient)
  const result = await response.json()

  assertEquals(response.status, 200)
  assertEquals(result.message, 'User already seeded')
  assertEquals(result.skipped, true)
  
  restoreEnv()
})

Deno.test("seed-user function - unauthorized access", async () => {
  setMockEnv()
  const mockClient = new MockSupabaseClient()
  
  const req = new Request('https://test.com', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer invalid-token',
      'Content-Type': 'application/json'
    }
  })

  const response = await seedUserFunction(req, mockClient)
  const result = await response.json()

  assertEquals(response.status, 401)
  assertEquals(result.error, 'Unauthorized')
  
  restoreEnv()
})

Deno.test("seed-user function - database error handling", async () => {
  setMockEnv()
  const mockClient = new MockSupabaseClient()
  
  // Set up mock error for categories insert
  mockClient.setMockError('categories', 'insert', { message: 'Database connection failed' })
  
  const req = new Request('https://test.com', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer valid-token',
      'Content-Type': 'application/json'
    }
  })

  const response = await seedUserFunction(req, mockClient)
  const result = await response.json()

  assertEquals(response.status, 500)
  assertExists(result.error)
  
  restoreEnv()
})

Deno.test("seed-user function - OPTIONS request handling", async () => {
  setMockEnv()
  const mockClient = new MockSupabaseClient()
  
  const req = new Request('https://test.com', {
    method: 'OPTIONS'
  })

  const response = await seedUserFunction(req, mockClient)
  const result = await response.text()

  assertEquals(response.status, 200)
  assertEquals(result, 'ok')
  
  restoreEnv()
})