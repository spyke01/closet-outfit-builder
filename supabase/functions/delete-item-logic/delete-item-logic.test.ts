import { assertEquals, assertExists } from "https://deno.land/std@0.168.0/testing/asserts.ts"

// Mock Supabase client for delete-item-logic tests
class MockSupabaseClient {
  private mockItem: any = null
  private mockAffectedOutfits: any[] = []
  private mockOutfitItemCounts: Map<string, number> = new Map()
  private mockErrors: any = {}
  private deletedItems: Set<string> = new Set()
  private deletedOutfits: Set<string> = new Set()

  constructor() {
    this.setupDefaultData()
  }

  setupDefaultData() {
    this.mockItem = {
      id: 'item-1',
      name: 'Navy Blazer',
      user_id: 'test-user-id'
    }

    this.mockAffectedOutfits = [
      {
        outfit_id: 'outfit-1',
        outfits: {
          id: 'outfit-1',
          name: 'Business Casual',
          score: 85,
          created_at: '2024-01-01T00:00:00Z',
          user_id: 'test-user-id'
        }
      },
      {
        outfit_id: 'outfit-2',
        outfits: {
          id: 'outfit-2',
          name: 'Single Item Outfit',
          score: 60,
          created_at: '2024-01-02T00:00:00Z',
          user_id: 'test-user-id'
        }
      },
      {
        outfit_id: 'outfit-3',
        outfits: {
          id: 'outfit-3',
          name: 'Two Item Outfit',
          score: 70,
          created_at: '2024-01-03T00:00:00Z',
          user_id: 'test-user-id'
        }
      }
    ]

    // Set up item counts for outfits
    this.mockOutfitItemCounts.set('outfit-1', 3) // Will have 2 items left
    this.mockOutfitItemCounts.set('outfit-2', 1) // Will be orphaned (0 items left)
    this.mockOutfitItemCounts.set('outfit-3', 2) // Will have 1 item left
  }

  setMockError(table: string, error: any) {
    this.mockErrors[table] = error
  }

  setMockItem(item: any) {
    this.mockItem = item
  }

  setMockAffectedOutfits(outfits: any[]) {
    this.mockAffectedOutfits = outfits
  }

  setOutfitItemCount(outfitId: string, count: number) {
    this.mockOutfitItemCounts.set(outfitId, count)
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
              single: () => {
                if (this.mockErrors.wardrobe_items) {
                  return Promise.resolve({
                    data: null,
                    error: this.mockErrors.wardrobe_items
                  })
                }
                return Promise.resolve({
                  data: this.mockItem,
                  error: null
                })
              }
            })
          })
        }),
        delete: () => ({
          eq: (column: string, value: any) => ({
            eq: (eqColumn2: string, eqValue2: any) => {
              if (this.mockErrors.delete_item) {
                return Promise.resolve({
                  error: this.mockErrors.delete_item
                })
              }
              this.deletedItems.add(value)
              return Promise.resolve({ error: null })
            }
          })
        })
      }
    }

    if (table === 'outfit_items') {
      return {
        select: (columns: string) => ({
          eq: (column: string, value: any) => ({
            eq: (eqColumn2: string, eqValue2: any) => {
              if (this.mockErrors.outfit_items) {
                return Promise.resolve({
                  data: null,
                  error: this.mockErrors.outfit_items
                })
              }
              return Promise.resolve({
                data: this.mockAffectedOutfits,
                error: null
              })
            }
          }),
          count: 'exact',
          head: true
        }),
        delete: () => ({
          eq: (column: string, value: any) => {
            if (this.mockErrors.delete_outfit_items) {
              return Promise.resolve({
                error: this.mockErrors.delete_outfit_items
              })
            }
            return Promise.resolve({ error: null })
          }
        })
      }
    }

    if (table === 'outfits') {
      return {
        delete: () => ({
          in: (column: string, values: string[]) => ({
            eq: (eqColumn: string, eqValue: any) => {
              if (this.mockErrors.delete_outfits) {
                return Promise.resolve({
                  error: this.mockErrors.delete_outfits
                })
              }
              values.forEach(id => this.deletedOutfits.add(id))
              return Promise.resolve({ error: null })
            }
          })
        })
      }
    }

    return {
      select: () => ({ 
        eq: () => Promise.resolve({ data: [], error: null }),
        count: this.mockOutfitItemCounts.get('outfit-1') || 0
      })
    }
  }

  // Mock count method for outfit items
  async getOutfitItemCount(outfitId: string): Promise<{ count: number | null, error: any }> {
    if (this.mockErrors.count) {
      return { count: null, error: this.mockErrors.count }
    }
    return { count: this.mockOutfitItemCounts.get(outfitId) || 0, error: null }
  }

  getDeletedItems() {
    return Array.from(this.deletedItems)
  }

  getDeletedOutfits() {
    return Array.from(this.deletedOutfits)
  }
}

async function deleteItemLogicFunction(req: Request, mockClient: MockSupabaseClient) {
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

    const { item_id, action = 'analyze', force_delete = false } = await req.json()

    if (!item_id) {
      return new Response(
        JSON.stringify({ error: 'item_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify item exists
    const { data: item, error: itemError } = await mockClient
      .from('wardrobe_items')
      .select('id, name, user_id')
      .eq('id', item_id)
      .eq('user_id', user.id)
      .single()

    if (itemError || !item) {
      return new Response(
        JSON.stringify({ error: 'Item not found or does not belong to user' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Find affected outfits
    const { data: affectedOutfits, error: outfitsError } = await mockClient
      .from('outfit_items')
      .select('*')
      .eq('item_id', item_id)
      .eq('outfits.user_id', user.id)

    if (outfitsError) {
      throw new Error(`Failed to fetch affected outfits: ${outfitsError.message}`)
    }

    const analysis = {
      can_delete: true,
      affected_outfits: [] as any[],
      orphaned_outfits: [] as any[],
      warnings: [] as string[],
      recommendations: [] as string[]
    }

    if (affectedOutfits && affectedOutfits.length > 0) {
      for (const affectedOutfit of affectedOutfits) {
        const outfitId = affectedOutfit.outfit_id
        
        // Get item count for this outfit
        const { count: totalItems } = await mockClient.getOutfitItemCount(outfitId)
        const remainingItems = (totalItems || 0) - 1

        const dependency = {
          outfit_id: outfitId,
          outfit_name: affectedOutfit.outfits.name,
          outfit_score: affectedOutfit.outfits.score,
          created_at: affectedOutfit.outfits.created_at,
          total_items: totalItems || 0,
          remaining_items: remainingItems
        }

        analysis.affected_outfits.push(dependency)

        if (remainingItems === 0) {
          analysis.orphaned_outfits.push(dependency)
          analysis.warnings.push(`Outfit "${dependency.outfit_name || 'Unnamed'}" will have no items left`)
        } else if (remainingItems === 1) {
          analysis.warnings.push(`Outfit "${dependency.outfit_name || 'Unnamed'}" will only have 1 item left`)
        }
      }

      if (analysis.orphaned_outfits.length > 0) {
        analysis.recommendations.push(`${analysis.orphaned_outfits.length} outfit(s) will be completely empty and should be deleted`)
        
        if (!force_delete) {
          analysis.can_delete = false
          analysis.warnings.push('Cannot delete item without force_delete=true due to orphaned outfits')
        }
      }
    }

    if (action === 'analyze') {
      return new Response(
        JSON.stringify({
          item: { id: item.id, name: item.name },
          analysis,
          action: 'analyze'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'delete') {
      if (!analysis.can_delete && !force_delete) {
        return new Response(
          JSON.stringify({
            error: 'Cannot delete item due to dependencies. Use force_delete=true to override.',
            analysis
          }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const deletionResults = {
        item_deleted: false,
        outfit_items_deleted: 0,
        orphaned_outfits_deleted: 0,
        errors: [] as string[]
      }

      try {
        // Delete outfit_items entries
        if (affectedOutfits && affectedOutfits.length > 0) {
          const { error: deleteOutfitItemsError } = await mockClient
            .from('outfit_items')
            .delete()
            .eq('item_id', item_id)

          if (deleteOutfitItemsError) {
            throw new Error(`Failed to delete outfit items: ${deleteOutfitItemsError.message}`)
          }

          deletionResults.outfit_items_deleted = affectedOutfits.length
        }

        // Delete orphaned outfits if force_delete
        if (force_delete && analysis.orphaned_outfits.length > 0) {
          const orphanedOutfitIds = analysis.orphaned_outfits.map(o => o.outfit_id)
          
          const { error: deleteOrphanedOutfitsError } = await mockClient
            .from('outfits')
            .delete()
            .in('id', orphanedOutfitIds)
            .eq('user_id', user.id)

          if (deleteOrphanedOutfitsError) {
            throw new Error(`Failed to delete orphaned outfits: ${deleteOrphanedOutfitsError.message}`)
          }

          deletionResults.orphaned_outfits_deleted = orphanedOutfitIds.length
        }

        // Delete the wardrobe item
        const { error: deleteItemError } = await mockClient
          .from('wardrobe_items')
          .delete()
          .eq('id', item_id)
          .eq('user_id', user.id)

        if (deleteItemError) {
          throw new Error(`Failed to delete wardrobe item: ${deleteItemError.message}`)
        }

        deletionResults.item_deleted = true

        return new Response(
          JSON.stringify({
            message: 'Item deleted successfully',
            item: { id: item.id, name: item.name },
            deletion_results: deletionResults,
            analysis,
            action: 'delete'
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      } catch (deleteError) {
        deletionResults.errors.push(deleteError.message)
        
        return new Response(
          JSON.stringify({
            error: 'Deletion failed',
            deletion_results: deletionResults,
            analysis
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action. Use "analyze" or "delete"' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

Deno.test("delete-item-logic - analyze action with orphaned outfits", async () => {
  const mockClient = new MockSupabaseClient()
  
  const req = new Request('https://test.com', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer valid-token',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      item_id: 'item-1',
      action: 'analyze'
    })
  })

  const response = await deleteItemLogicFunction(req, mockClient)
  const result = await response.json()

  assertEquals(response.status, 200)
  assertEquals(result.action, 'analyze')
  assertExists(result.analysis)
  assertEquals(result.analysis.affected_outfits.length, 3)
  assertEquals(result.analysis.orphaned_outfits.length, 1) // outfit-2 will be orphaned
  assertEquals(result.analysis.can_delete, false) // Should be false due to orphaned outfits
  assertEquals(result.analysis.warnings.length > 0, true)
})

Deno.test("delete-item-logic - analyze action with no dependencies", async () => {
  const mockClient = new MockSupabaseClient()
  mockClient.setMockAffectedOutfits([]) // No affected outfits
  
  const req = new Request('https://test.com', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer valid-token',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      item_id: 'item-1',
      action: 'analyze'
    })
  })

  const response = await deleteItemLogicFunction(req, mockClient)
  const result = await response.json()

  assertEquals(response.status, 200)
  assertEquals(result.analysis.affected_outfits.length, 0)
  assertEquals(result.analysis.orphaned_outfits.length, 0)
  assertEquals(result.analysis.can_delete, true)
  assertEquals(result.analysis.warnings.length, 0)
})

Deno.test("delete-item-logic - delete action without force_delete fails", async () => {
  const mockClient = new MockSupabaseClient()
  
  const req = new Request('https://test.com', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer valid-token',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      item_id: 'item-1',
      action: 'delete',
      force_delete: false
    })
  })

  const response = await deleteItemLogicFunction(req, mockClient)
  const result = await response.json()

  assertEquals(response.status, 409)
  assertEquals(result.error, 'Cannot delete item due to dependencies. Use force_delete=true to override.')
  assertExists(result.analysis)
})

Deno.test("delete-item-logic - delete action with force_delete succeeds", async () => {
  const mockClient = new MockSupabaseClient()
  
  const req = new Request('https://test.com', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer valid-token',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      item_id: 'item-1',
      action: 'delete',
      force_delete: true
    })
  })

  const response = await deleteItemLogicFunction(req, mockClient)
  const result = await response.json()

  assertEquals(response.status, 200)
  assertEquals(result.message, 'Item deleted successfully')
  assertEquals(result.deletion_results.item_deleted, true)
  assertEquals(result.deletion_results.outfit_items_deleted, 3)
  assertEquals(result.deletion_results.orphaned_outfits_deleted, 1)
  assertEquals(result.action, 'delete')
})

Deno.test("delete-item-logic - delete item with no dependencies", async () => {
  const mockClient = new MockSupabaseClient()
  mockClient.setMockAffectedOutfits([]) // No affected outfits
  
  const req = new Request('https://test.com', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer valid-token',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      item_id: 'item-1',
      action: 'delete'
    })
  })

  const response = await deleteItemLogicFunction(req, mockClient)
  const result = await response.json()

  assertEquals(response.status, 200)
  assertEquals(result.deletion_results.item_deleted, true)
  assertEquals(result.deletion_results.outfit_items_deleted, 0)
  assertEquals(result.deletion_results.orphaned_outfits_deleted, 0)
})

Deno.test("delete-item-logic - missing item_id parameter", async () => {
  const mockClient = new MockSupabaseClient()
  
  const req = new Request('https://test.com', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer valid-token',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      action: 'analyze'
    })
  })

  const response = await deleteItemLogicFunction(req, mockClient)
  const result = await response.json()

  assertEquals(response.status, 400)
  assertEquals(result.error, 'item_id is required')
})

Deno.test("delete-item-logic - item not found", async () => {
  const mockClient = new MockSupabaseClient()
  mockClient.setMockError('wardrobe_items', { message: 'Item not found' })
  
  const req = new Request('https://test.com', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer valid-token',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      item_id: 'non-existent-id',
      action: 'analyze'
    })
  })

  const response = await deleteItemLogicFunction(req, mockClient)
  const result = await response.json()

  assertEquals(response.status, 404)
  assertEquals(result.error, 'Item not found or does not belong to user')
})

Deno.test("delete-item-logic - invalid action parameter", async () => {
  const mockClient = new MockSupabaseClient()
  
  const req = new Request('https://test.com', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer valid-token',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      item_id: 'item-1',
      action: 'invalid-action'
    })
  })

  const response = await deleteItemLogicFunction(req, mockClient)
  const result = await response.json()

  assertEquals(response.status, 400)
  assertEquals(result.error, 'Invalid action. Use "analyze" or "delete"')
})

Deno.test("delete-item-logic - unauthorized access", async () => {
  const mockClient = new MockSupabaseClient()
  
  const req = new Request('https://test.com', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer invalid-token',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      item_id: 'item-1',
      action: 'analyze'
    })
  })

  const response = await deleteItemLogicFunction(req, mockClient)
  const result = await response.json()

  assertEquals(response.status, 401)
  assertEquals(result.error, 'Unauthorized')
})

Deno.test("delete-item-logic - database error during deletion", async () => {
  const mockClient = new MockSupabaseClient()
  mockClient.setMockError('delete_item', { message: 'Database connection failed' })
  
  const req = new Request('https://test.com', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer valid-token',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      item_id: 'item-1',
      action: 'delete',
      force_delete: true
    })
  })

  const response = await deleteItemLogicFunction(req, mockClient)
  const result = await response.json()

  assertEquals(response.status, 500)
  assertEquals(result.error, 'Deletion failed')
  assertExists(result.deletion_results)
  assertEquals(result.deletion_results.errors.length > 0, true)
})