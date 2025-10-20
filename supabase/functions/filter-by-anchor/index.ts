import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WardrobeItem {
  id: string;
  name: string;
  color?: string;
  formality_score?: number;
  capsule_tags?: string[];
  season?: string[];
  category_name: string;
}

interface CompatibilityScore {
  item: WardrobeItem;
  compatibility_score: number;
  reasons: string[];
}

function calculateCompatibility(anchorItem: WardrobeItem, candidateItem: WardrobeItem): { score: number; reasons: string[] } {
  let score = 50; // Base compatibility score
  const reasons: string[] = [];

  // Skip if same item
  if (anchorItem.id === candidateItem.id) {
    return { score: 0, reasons: ['Same item'] };
  }

  // Skip if same category
  if (anchorItem.category_name === candidateItem.category_name) {
    return { score: 0, reasons: ['Same category'] };
  }

  // Formality compatibility (most important factor)
  if (anchorItem.formality_score && candidateItem.formality_score) {
    const formalityDiff = Math.abs(anchorItem.formality_score - candidateItem.formality_score);
    
    if (formalityDiff <= 1) {
      score += 25;
      reasons.push('Perfect formality match');
    } else if (formalityDiff <= 2) {
      score += 15;
      reasons.push('Good formality match');
    } else if (formalityDiff <= 3) {
      score += 5;
      reasons.push('Acceptable formality match');
    } else {
      score -= 10;
      reasons.push('Formality mismatch');
    }
  }

  // Color compatibility
  if (anchorItem.color && candidateItem.color) {
    const anchorColor = anchorItem.color.toLowerCase();
    const candidateColor = candidateItem.color.toLowerCase();
    
    // Define color harmony rules
    const neutrals = ['white', 'black', 'grey', 'gray', 'navy', 'cream', 'beige', 'khaki', 'brown'];
    const earthTones = ['brown', 'tan', 'khaki', 'olive', 'cream', 'beige'];
    const blues = ['navy', 'blue', 'light blue', 'dark blue'];
    
    // Same color family bonus
    if (anchorColor === candidateColor) {
      score += 15;
      reasons.push('Matching colors');
    }
    // Neutral combinations
    else if (neutrals.includes(anchorColor) && neutrals.includes(candidateColor)) {
      score += 20;
      reasons.push('Neutral color harmony');
    }
    // Earth tone combinations
    else if (earthTones.includes(anchorColor) && earthTones.includes(candidateColor)) {
      score += 15;
      reasons.push('Earth tone harmony');
    }
    // Blue family combinations
    else if (blues.includes(anchorColor) && blues.includes(candidateColor)) {
      score += 10;
      reasons.push('Blue family harmony');
    }
    // White goes with everything
    else if (anchorColor === 'white' || candidateColor === 'white') {
      score += 12;
      reasons.push('White versatility');
    }
    // Navy goes with most things
    else if (anchorColor === 'navy' || candidateColor === 'navy') {
      score += 8;
      reasons.push('Navy versatility');
    }
    // Contrasting colors (can work but lower score)
    else {
      score += 2;
      reasons.push('Color contrast');
    }
  }

  // Seasonal compatibility
  const anchorSeasons = anchorItem.season || ['All'];
  const candidateSeasons = candidateItem.season || ['All'];
  
  const hasCommonSeason = anchorSeasons.some(season => 
    candidateSeasons.includes(season) || season === 'All' || candidateSeasons.includes('All')
  );
  
  if (hasCommonSeason) {
    score += 10;
    reasons.push('Seasonal compatibility');
  } else {
    score -= 5;
    reasons.push('Seasonal mismatch');
  }

  // Capsule tag compatibility
  if (anchorItem.capsule_tags && candidateItem.capsule_tags) {
    const anchorTags = new Set(anchorItem.capsule_tags);
    const candidateTags = new Set(candidateItem.capsule_tags);
    const commonTags = [...anchorTags].filter(tag => candidateTags.has(tag));
    
    if (commonTags.length > 0) {
      score += commonTags.length * 5;
      reasons.push(`Shared style tags: ${commonTags.join(', ')}`);
    }
  }

  // Category-specific compatibility rules
  const anchorCategory = anchorItem.category_name.toLowerCase();
  const candidateCategory = candidateItem.category_name.toLowerCase();
  
  // Jacket/Overshirt compatibility
  if (anchorCategory.includes('jacket') || anchorCategory.includes('overshirt')) {
    if (candidateCategory.includes('shirt')) {
      score += 8;
      reasons.push('Jacket-shirt pairing');
    } else if (candidateCategory.includes('pants')) {
      score += 6;
      reasons.push('Jacket-pants pairing');
    }
  }
  
  // Shirt compatibility
  if (anchorCategory.includes('shirt')) {
    if (candidateCategory.includes('pants')) {
      score += 10;
      reasons.push('Shirt-pants core pairing');
    } else if (candidateCategory.includes('shoes')) {
      score += 5;
      reasons.push('Shirt-shoes pairing');
    }
  }
  
  // Pants compatibility
  if (anchorCategory.includes('pants')) {
    if (candidateCategory.includes('shoes')) {
      score += 8;
      reasons.push('Pants-shoes pairing');
    } else if (candidateCategory.includes('belt')) {
      score += 6;
      reasons.push('Pants-belt pairing');
    }
  }

  return { 
    score: Math.max(0, Math.min(100, score)), 
    reasons: reasons.length > 0 ? reasons : ['Basic compatibility'] 
  };
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

    const { 
      anchor_item_id, 
      target_categories, 
      min_compatibility_score = 60,
      limit = 50,
      target_season = 'All'
    } = await req.json()

    if (!anchor_item_id) {
      return new Response(
        JSON.stringify({ error: 'anchor_item_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch the anchor item
    const { data: anchorItems, error: anchorError } = await supabaseClient
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

    const anchorItem: WardrobeItem = {
      id: anchorItems.id,
      name: anchorItems.name,
      color: anchorItems.color,
      formality_score: anchorItems.formality_score,
      capsule_tags: anchorItems.capsule_tags,
      season: anchorItems.season,
      category_name: anchorItems.categories.name
    }

    // Build query for candidate items
    let candidateQuery = supabaseClient
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
      .eq('user_id', user.id)
      .eq('active', true)
      .neq('id', anchor_item_id) // Exclude the anchor item itself

    // Filter by target categories if specified
    if (target_categories && Array.isArray(target_categories) && target_categories.length > 0) {
      candidateQuery = candidateQuery.in('categories.name', target_categories)
    }

    const { data: candidateItems, error: candidatesError } = await candidateQuery

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

    // Calculate compatibility scores for all candidates
    const compatibilityScores: CompatibilityScore[] = candidateItems
      .map(item => {
        const candidateItem: WardrobeItem = {
          id: item.id,
          name: item.name,
          color: item.color,
          formality_score: item.formality_score,
          capsule_tags: item.capsule_tags,
          season: item.season,
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
        target_season,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Filter by anchor error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})