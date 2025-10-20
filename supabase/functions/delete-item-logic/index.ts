import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface OutfitDependency {
  outfit_id: string;
  outfit_name?: string;
  outfit_score?: number;
  created_at: string;
  total_items: number;
  remaining_items: number;
}

interface DeleteAnalysis {
  can_delete: boolean;
  affected_outfits: OutfitDependency[];
  orphaned_outfits: OutfitDependency[];
  warnings: string[];
  recommendations: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user } } = await supabaseClient.auth.getUser(token)

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

    // Verify the item exists and belongs to the user
    const { data: item, error: itemError } = await supabaseClient
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

    // Find all outfits that contain this item
    const { data: affectedOutfits, error: outfitsError } = await supabaseClient
      .from('outfit_items')
      .select(`
        outfit_id,
        outfits!inner(
          id,
          name,
          score,
          created_at,
          user_id
        )
      `)
      .eq('item_id', item_id)
      .eq('outfits.user_id', user.id)

    if (outfitsError) {
      throw new Error(`Failed to fetch affected outfits: ${outfitsError.message}`)
    }

    const analysis: DeleteAnalysis = {
      can_delete: true,
      affected_outfits: [],
      orphaned_outfits: [],
      warnings: [],
      recommendations: []
    }

    if (affectedOutfits && affectedOutfits.length > 0) {
      // For each affected outfit, count total items and remaining items after deletion
      for (const affectedOutfit of affectedOutfits) {
        const outfitId = affectedOutfit.outfit_id
        
        // Count total items in this outfit
        const { count: totalItems, error: countError } = await supabaseClient
          .from('outfit_items')
          .select('*', { count: 'exact', head: true })
          .eq('outfit_id', outfitId)

        if (countError) {
          console.error(`Error counting items for outfit ${outfitId}:`, countError)
          continue
        }

        const remainingItems = (totalItems || 0) - 1

        const dependency: OutfitDependency = {
          outfit_id: outfitId,
          outfit_name: affectedOutfit.outfits.name,
          outfit_score: affectedOutfit.outfits.score,
          created_at: affectedOutfit.outfits.created_at,
          total_items: totalItems || 0,
          remaining_items: remainingItems
        }

        analysis.affected_outfits.push(dependency)

        // Check if outfit will become orphaned (no items left)
        if (remainingItems === 0) {
          analysis.orphaned_outfits.push(dependency)
          analysis.warnings.push(`Outfit "${dependency.outfit_name || 'Unnamed'}" will have no items left`)
        } else if (remainingItems === 1) {
          analysis.warnings.push(`Outfit "${dependency.outfit_name || 'Unnamed'}" will only have 1 item left`)
        } else if (remainingItems === 2) {
          analysis.warnings.push(`Outfit "${dependency.outfit_name || 'Unnamed'}" will only have 2 items left`)
        }
      }

      // Generate recommendations
      if (analysis.orphaned_outfits.length > 0) {
        analysis.recommendations.push(`${analysis.orphaned_outfits.length} outfit(s) will be completely empty and should be deleted`)
        
        if (!force_delete) {
          analysis.can_delete = false
          analysis.warnings.push('Cannot delete item without force_delete=true due to orphaned outfits')
        }
      }

      if (analysis.affected_outfits.length > 0) {
        analysis.recommendations.push(`Consider reviewing ${analysis.affected_outfits.length} affected outfit(s) before deletion`)
      }
    }

    // If this is just an analysis, return the results
    if (action === 'analyze') {
      return new Response(
        JSON.stringify({
          item: {
            id: item.id,
            name: item.name
          },
          analysis,
          action: 'analyze'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // If this is a delete action, proceed with deletion
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

      // Start transaction-like operations
      const deletionResults = {
        item_deleted: false,
        outfit_items_deleted: 0,
        orphaned_outfits_deleted: 0,
        errors: [] as string[]
      }

      try {
        // Delete outfit_items entries first
        if (affectedOutfits && affectedOutfits.length > 0) {
          const { error: deleteOutfitItemsError } = await supabaseClient
            .from('outfit_items')
            .delete()
            .eq('item_id', item_id)

          if (deleteOutfitItemsError) {
            throw new Error(`Failed to delete outfit items: ${deleteOutfitItemsError.message}`)
          }

          deletionResults.outfit_items_deleted = affectedOutfits.length
        }

        // Delete orphaned outfits if force_delete is true
        if (force_delete && analysis.orphaned_outfits.length > 0) {
          const orphanedOutfitIds = analysis.orphaned_outfits.map(o => o.outfit_id)
          
          const { error: deleteOrphanedOutfitsError } = await supabaseClient
            .from('outfits')
            .delete()
            .in('id', orphanedOutfitIds)
            .eq('user_id', user.id)

          if (deleteOrphanedOutfitsError) {
            throw new Error(`Failed to delete orphaned outfits: ${deleteOrphanedOutfitsError.message}`)
          }

          deletionResults.orphaned_outfits_deleted = orphanedOutfitIds.length
        }

        // Finally, delete the wardrobe item
        const { error: deleteItemError } = await supabaseClient
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
            item: {
              id: item.id,
              name: item.name
            },
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
    console.error('Delete item logic error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})