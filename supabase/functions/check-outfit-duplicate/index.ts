import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface OutfitComposition {
  item_ids: string[];
  tuck_style?: string;
}

function normalizeOutfitComposition(composition: OutfitComposition): string {
  // Sort item IDs to ensure consistent comparison regardless of order
  const sortedIds = [...composition.item_ids].sort()
  
  // Create a normalized string representation
  const baseComposition = sortedIds.join(',')
  const tuckStyle = composition.tuck_style || 'Untucked'
  
  return `${baseComposition}|${tuckStyle}`
}

function calculateSimilarityScore(outfit1: string[], outfit2: string[], tuck1?: string, tuck2?: string): number {
  const set1 = new Set(outfit1)
  const set2 = new Set(outfit2)
  
  // Calculate Jaccard similarity (intersection / union)
  const intersection = new Set([...set1].filter(x => set2.has(x)))
  const union = new Set([...set1, ...set2])
  
  let similarity = intersection.size / union.size
  
  // Adjust similarity based on tuck style
  if (tuck1 && tuck2 && tuck1 === tuck2) {
    similarity += 0.1 // Small bonus for matching tuck style
  }
  
  return similarity
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
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

    const { item_ids, tuck_style, similarity_threshold = 0.8 } = await req.json()

    if (!item_ids || !Array.isArray(item_ids) || item_ids.length === 0) {
      return new Response(
        JSON.stringify({ error: 'item_ids array is required and cannot be empty' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate that all items belong to the user
    const { data: userItems, error: itemsError } = await supabaseClient
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

    // Get all existing outfits for the user with their items
    const { data: existingOutfits, error: outfitsError } = await supabaseClient
      .from('outfits')
      .select(`
        id,
        name,
        tuck_style,
        score,
        created_at,
        outfit_items!inner(
          item_id
        )
      `)
      .eq('user_id', user.id)

    if (outfitsError) {
      throw new Error(`Failed to fetch existing outfits: ${outfitsError.message}`)
    }

    const newComposition = normalizeOutfitComposition({ item_ids, tuck_style })
    const duplicates = []
    const similarOutfits = []

    for (const outfit of existingOutfits || []) {
      const existingItemIds = outfit.outfit_items.map(oi => oi.item_id)
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

      // Check for high similarity
      const similarity = calculateSimilarityScore(
        item_ids,
        existingItemIds,
        tuck_style,
        outfit.tuck_style
      )

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

    const isDuplicate = duplicates.length > 0
    const hasSimilar = similarOutfits.length > 0

    return new Response(
      JSON.stringify({
        is_duplicate: isDuplicate,
        has_similar: hasSimilar,
        exact_matches: duplicates,
        similar_matches: similarOutfits,
        total_existing_outfits: existingOutfits?.length || 0,
        similarity_threshold,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Check outfit duplicate error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})