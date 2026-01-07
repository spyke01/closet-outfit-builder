import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { handleCorsPreflightRequest, createCorsResponse } from '../_shared/cors.ts'

interface OutfitItem {
  id: string;
  name: string;
  color?: string;
  formality_score?: number;
  capsule_tags?: string[];
  season?: string[];
  category_name: string;
}

interface OutfitSelection {
  jacket?: OutfitItem;
  shirt?: OutfitItem;
  pants?: OutfitItem;
  shoes?: OutfitItem;
  belt?: OutfitItem;
  watch?: OutfitItem;
  tuck_style?: 'Tucked' | 'Untucked';
}

interface ScoreBreakdown {
  formality: number;
  color_harmony: number;
  seasonal_appropriateness: number;
  style_consistency: number;
  total: number;
}

function calculateFormalityScore(selection: OutfitSelection): number {
  const items = [selection.jacket, selection.shirt, selection.pants, selection.shoes, selection.belt, selection.watch]
    .filter(Boolean) as OutfitItem[];
  
  if (items.length === 0) return 0;
  
  const formalityScores = items
    .map(item => item.formality_score || 5)
    .filter(score => score > 0);
  
  if (formalityScores.length === 0) return 50;
  
  const avgFormality = formalityScores.reduce((sum, score) => sum + score, 0) / formalityScores.length;
  const variance = formalityScores.reduce((sum, score) => sum + Math.pow(score - avgFormality, 2), 0) / formalityScores.length;
  
  // Lower variance = higher consistency = higher score
  const consistencyScore = Math.max(0, 100 - (variance * 10));
  
  return Math.round(consistencyScore);
}

function calculateColorHarmony(selection: OutfitSelection): number {
  const items = [selection.jacket, selection.shirt, selection.pants, selection.shoes, selection.belt]
    .filter(Boolean) as OutfitItem[];
  
  if (items.length < 2) return 80; // Default good score for single items
  
  const colors = items.map(item => item.color?.toLowerCase()).filter(Boolean);
  if (colors.length < 2) return 70;
  
  // Define color harmony rules
  const neutrals = ['white', 'black', 'grey', 'gray', 'navy', 'cream', 'beige', 'khaki', 'brown'];
  const earthTones = ['brown', 'tan', 'khaki', 'olive', 'cream', 'beige'];
  const blues = ['navy', 'blue', 'light blue', 'dark blue'];
  
  let harmonyScore = 60; // Base score
  
  // Bonus for neutral combinations
  const neutralCount = colors.filter(color => neutrals.includes(color)).length;
  if (neutralCount >= colors.length * 0.7) {
    harmonyScore += 20;
  }
  
  // Bonus for monochromatic schemes
  const uniqueColors = new Set(colors);
  if (uniqueColors.size <= 2) {
    harmonyScore += 15;
  }
  
  // Bonus for earth tone combinations
  const earthToneCount = colors.filter(color => earthTones.includes(color)).length;
  if (earthToneCount >= 2) {
    harmonyScore += 10;
  }
  
  return Math.min(100, Math.round(harmonyScore));
}

function calculateSeasonalScore(selection: OutfitSelection, targetSeason: string = 'All'): number {
  const items = [selection.jacket, selection.shirt, selection.pants, selection.shoes]
    .filter(Boolean) as OutfitItem[];
  
  if (items.length === 0) return 80;
  
  let appropriateItems = 0;
  
  for (const item of items) {
    const seasons = item.season || ['All'];
    if (seasons.includes('All') || seasons.includes(targetSeason)) {
      appropriateItems++;
    }
  }
  
  const seasonalScore = (appropriateItems / items.length) * 100;
  return Math.round(seasonalScore);
}

function calculateStyleConsistency(selection: OutfitSelection): number {
  const items = [selection.jacket, selection.shirt, selection.pants, selection.shoes]
    .filter(Boolean) as OutfitItem[];
  
  if (items.length === 0) return 80;
  
  // Check for style consistency based on formality and item types
  let consistencyScore = 70; // Base score
  
  // Bonus for complete outfits
  if (selection.shirt && selection.pants && selection.shoes) {
    consistencyScore += 10;
  }
  
  // Check formality alignment
  const formalityScores = items
    .map(item => item.formality_score || 5)
    .filter(score => score > 0);
  
  if (formalityScores.length >= 2) {
    const maxFormality = Math.max(...formalityScores);
    const minFormality = Math.min(...formalityScores);
    const formalityRange = maxFormality - minFormality;
    
    // Smaller range = better consistency
    if (formalityRange <= 2) {
      consistencyScore += 15;
    } else if (formalityRange <= 4) {
      consistencyScore += 5;
    }
  }
  
  // Tuck style bonus for formal outfits
  if (selection.tuck_style === 'Tucked' && selection.shirt && selection.pants) {
    const avgFormality = formalityScores.reduce((sum, score) => sum + score, 0) / formalityScores.length;
    if (avgFormality >= 6) {
      consistencyScore += 5;
    }
  }
  
  return Math.min(100, Math.round(consistencyScore));
}

function calculateOutfitScore(selection: OutfitSelection, targetSeason: string = 'All'): ScoreBreakdown {
  const formality = calculateFormalityScore(selection);
  const color_harmony = calculateColorHarmony(selection);
  const seasonal_appropriateness = calculateSeasonalScore(selection, targetSeason);
  const style_consistency = calculateStyleConsistency(selection);
  
  // Weighted average: formality and color harmony are most important
  const total = Math.round(
    (formality * 0.3) + 
    (color_harmony * 0.3) + 
    (seasonal_appropriateness * 0.2) + 
    (style_consistency * 0.2)
  );
  
  return {
    formality,
    color_harmony,
    seasonal_appropriateness,
    style_consistency,
    total: Math.max(0, Math.min(100, total))
  };
}

serve(async (req) => {
  const origin = req.headers.get('Origin');
  
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(req);
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Check if we have an Authorization header (for user auth) or use service role
    const authHeader = req.headers.get('Authorization')
    let userId: string | null = null
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      const { data: { user } } = await supabaseClient.auth.getUser(token)
      
      if (!user) {
        return createCorsResponse(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } },
          origin
        )
      }
      userId = user.id
    }

    const { item_ids, tuck_style, target_season, user_id } = await req.json()

    if (!item_ids || !Array.isArray(item_ids)) {
      return createCorsResponse(
        JSON.stringify({ error: 'item_ids array is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
        origin
      )
    }

    // Use provided user_id (for service role calls) or authenticated user_id
    const targetUserId = user_id || userId
    
    if (!targetUserId) {
      return createCorsResponse(
        JSON.stringify({ error: 'User ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
        origin
      )
    }

    // Fetch the wardrobe items with category information
    const { data: items, error: itemsError } = await supabaseClient
      .from('wardrobe_items')
      .select(`
        id,
        name,
        color,
        formality_score,
        capsule_tags,
        season,
        categories!inner(name)
      `)
      .in('id', item_ids)
      .eq('user_id', targetUserId)
      .eq('active', true)

    if (itemsError) {
      throw new Error(`Failed to fetch items: ${itemsError.message}`)
    }

    if (!items || items.length === 0) {
      return createCorsResponse(
        JSON.stringify({ error: 'No valid items found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } },
        origin
      )
    }

    // Build outfit selection object
    const selection: OutfitSelection = { tuck_style }
    
    for (const item of items) {
      const categoryName = item.categories.name.toLowerCase()
      const outfitItem: OutfitItem = {
        id: item.id,
        name: item.name,
        color: item.color,
        formality_score: item.formality_score,
        capsule_tags: item.capsule_tags,
        season: item.season,
        category_name: item.categories.name
      }
      
      if (categoryName.includes('jacket') || categoryName.includes('overshirt')) {
        selection.jacket = outfitItem
      } else if (categoryName.includes('shirt')) {
        selection.shirt = outfitItem
      } else if (categoryName.includes('pants')) {
        selection.pants = outfitItem
      } else if (categoryName.includes('shoes')) {
        selection.shoes = outfitItem
      } else if (categoryName.includes('belt')) {
        selection.belt = outfitItem
      } else if (categoryName.includes('watch')) {
        selection.watch = outfitItem
      }
    }

    const scoreBreakdown = calculateOutfitScore(selection, target_season || 'All')

    return createCorsResponse(
      JSON.stringify({
        score: scoreBreakdown.total,
        breakdown: scoreBreakdown,
        selection,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
      origin
    )

  } catch (error) {
    console.error('Score outfit error:', error)
    return createCorsResponse(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
      origin
    )
  }
})