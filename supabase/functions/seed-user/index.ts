import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { handleCorsPreflightRequest, createCorsResponse } from '../_shared/cors.ts'



interface DefaultCategory {
  name: string;
  is_anchor_item: boolean;
  display_order: number;
}

interface DefaultWardrobeItem {
  id: string;
  name: string;
  category: string;
  brand?: string;
  capsuleTags?: string[];
  formalityScore?: number;
  image?: string;
}

interface DefaultOutfit {
  id: string;
  name: string;
  items: string[];
  tuck?: string;
  weight?: number;
  loved?: boolean;
}

// Extract color from item name for database storage
function extractColor(name: string): string | null {
  const colorMatches = name.match(/\(([^)]+)\)/);
  return colorMatches ? colorMatches[1] : null;
}

// Map season based on capsule tags and item type
function mapSeason(capsuleTags: string[] = []): string[] {
  if (capsuleTags.includes('Shorts')) return ['Summer'];
  return ['All']; // Default to all seasons
}

const defaultCategories: DefaultCategory[] = [
  { name: 'Jacket/Overshirt', is_anchor_item: true, display_order: 1 },
  { name: 'Shirt', is_anchor_item: true, display_order: 2 },
  { name: 'Pants', is_anchor_item: true, display_order: 3 },
  { name: 'Shoes', is_anchor_item: true, display_order: 4 },
  { name: 'Belt', is_anchor_item: false, display_order: 5 },
  { name: 'Watch', is_anchor_item: false, display_order: 6 },
  { name: 'Undershirt', is_anchor_item: false, display_order: 7 },
];

// Wardrobe data from src/data/wardrobe.json
const wardrobeData: DefaultWardrobeItem[] = [
  {"id":"belt-braided","name":"Braided Belt","category":"Belt","capsuleTags":["Crossover","Refined"],"formalityScore":5,"image":"/images/wardrobe/braided-belt.png","brand":"Banana Republic"},
  {"id":"belt-clean-brown","name":"Belt (Clean Brown)","category":"Belt","capsuleTags":["Refined"],"formalityScore":6,"image":"/images/wardrobe/belt-brown-clean.png","brand":"Banana Republic"},
  {"id":"belt-reversible","name":"Reversible Belt (Brown/Black)","category":"Belt","capsuleTags":["Refined"],"formalityScore":7,"image":"/images/wardrobe/belt-reversible.png","brand":"Banana Republic"},
  {"id":"belt-rugged","name":"Rugged Belt","category":"Belt","capsuleTags":["Adventurer"],"formalityScore":3,"image":"/images/wardrobe/belt-rugged.png","brand":"Levi's"},
  {"id":"belt-black-pebbled","name":"Pebbled Belt (Black)","category":"Belt","capsuleTags":["Refined"],"formalityScore":7,"image":"/images/wardrobe/belt-black-pebbled.png","brand":"Banana Republic"},
  {"id":"boots-brown-apache","name":"Apache Boots","category":"Shoes","capsuleTags":["Adventurer"],"formalityScore":4,"image":"/images/wardrobe/boots-brown-apache.png","brand":"Chippewa"},
  {"id":"cardigan-grey-shawl","name":"Shawl Cardigan (Grey)","category":"Jacket/Overshirt","capsuleTags":["Refined","Crossover"],"formalityScore":6,"image":"/images/wardrobe/cardigan-grey.png","brand":"Banana Republic"},
  {"id":"chinos-black","name":"Chinos (Black)","category":"Pants","capsuleTags":["Adventurer","Crossover"],"formalityScore":6,"image":"/images/wardrobe/chinos-black.png","brand":"Banana Republic"},
  {"id":"chinos-khaki","name":"Chinos (Khaki)","category":"Pants","capsuleTags":["Refined"],"formalityScore":6,"image":"/images/wardrobe/chino-khaki.png","brand":"Perry Ellis"},
  {"id":"chinos-light-grey","name":"Chinos (Light Grey)","category":"Pants","capsuleTags":["Refined"],"formalityScore":6,"image":"/images/wardrobe/chinos-grey.png","brand":"Banana Republic"},
  {"id":"chinos-navy","name":"Chinos (Navy)","category":"Pants","capsuleTags":["Refined","Crossover"],"formalityScore":6,"image":"/images/wardrobe/chino-navy.png","brand":"Banana Republic"},
  {"id":"chinos-olive","name":"Chinos (Olive)","category":"Pants","capsuleTags":["Adventurer","Crossover"],"formalityScore":6,"image":"/images/wardrobe/chinos-olive.png","brand":"Ben Sherman"},
  {"id":"chinos-white","name":"Chinos (White)","category":"Pants","capsuleTags":["Refined","Crossover"],"formalityScore":6,"image":"/images/wardrobe/chinos-white.png","brand":"Banana Republic"},
  {"id":"denim-dark","name":"Denim (Dark)","category":"Pants","capsuleTags":["Crossover","Adventurer"],"formalityScore":4,"image":"/images/wardrobe/jean-black.png","brand":"Banana Republic"},
  {"id":"double-monk-black","name":"Double Monks (Black)","category":"Shoes","capsuleTags":["Refined"],"formalityScore":8,"image":"/images/wardrobe/double-monk-black.png"},
  {"id":"jeans-medium","name":"Jeans (Medium)","category":"Pants","capsuleTags":["Crossover","Adventurer"],"formalityScore":3,"image":"/images/wardrobe/jean-medium.png","brand":"Banana Republic"},
  {"id":"gilet-navy","name":"Gilet (Navy)","category":"Jacket/Overshirt","capsuleTags":["Refined","Crossover"],"formalityScore":7,"image":"/images/wardrobe/gilet-navy.png","brand":"Polo Ralph Lauren"},
  {"id":"henley-grey-knit","name":"Henley Knit (Grey)","category":"Shirt","capsuleTags":["Adventurer"],"formalityScore":3,"image":"/images/wardrobe/grey-henley-knit.png","brand":"Banana Republic"},
  {"id":"loafers-black-horsebit","name":"Horsebit Loafers (Black)","category":"Shoes","capsuleTags":["Refined"],"formalityScore":8,"image":"/images/wardrobe/loafers-black-horsebit.png"},
  {"id":"loafers-black-penny","name":"Loafers (Black)","category":"Shoes","capsuleTags":["Refined"],"formalityScore":7,"image":"/images/wardrobe/loafers-black-penny.png","brand":"UNKNOWN"},
  {"id":"loafers-dark-brown","name":"Loafers (Dark Brown)","category":"Shoes","capsuleTags":["Refined"],"formalityScore":7,"image":"/images/wardrobe/loafers-dark-brown.png","brand":"Allen Edmonds"},
  {"id":"loafers-dark-brown-suede","name":"Suede Loafers (Dark Brown)","category":"Shoes","capsuleTags":["Refined","Shorts"],"formalityScore":6,"image":"/images/wardrobe/rockport-dark-sude-loafers.png","brand":"Rockport"},
  {"id":"loafers-light-tan","name":"Suede Loafers (Light Tan)","category":"Shoes","capsuleTags":["Refined","Shorts"],"formalityScore":6,"image":"/images/wardrobe/loafers-light-tan.png","brand":"Clarks"},
  {"id":"loafers-tan-suede","name":"Suede Loafers (Tan)","category":"Shoes","capsuleTags":["Refined"],"formalityScore":6,"image":"/images/wardrobe/loafers-tan-suede.png","brand":"UNKNOWN"},
  {"id":"mac-coat-navy","name":"Mac Coat (Navy)","category":"Jacket/Overshirt","capsuleTags":["Refined","Crossover"],"formalityScore":7,"image":"/images/wardrobe/mac-coat-navy.png","brand":"Banana Republic"},
  {"id":"moto-jacket","name":"Moto Jacket","category":"Jacket/Overshirt","capsuleTags":["Adventurer","Crossover"],"formalityScore":3,"image":"/images/wardrobe/goodthreads-moto-jacket.png","brand":"Goodthreads"},
  {"id":"ocbd-black-linen","name":"Linen Shirt (Black)","category":"Shirt","capsuleTags":["Adventurer","Crossover"],"formalityScore":4,"image":"/images/wardrobe/ocbd-linen-black.png","brand":"Banana Republic"},
  {"id":"ocbd-blue","name":"OCBD (Blue)","category":"Shirt","capsuleTags":["Refined"],"formalityScore":7,"image":"/images/wardrobe/ocbd-navy.png","brand":"Polo Ralph Lauren"},
  {"id":"ocbd-blue-featherweight","name":"Featherweight Shirt (Blue)","category":"Shirt","brand":"Polo Ralph Lauren","capsuleTags":["Refined","Crossover"],"formalityScore":6,"image":"/images/wardrobe/ocbd-blue.png"},
  {"id":"ocbd-deep-navy-linen","name":"Linen Shirt (Deep Navy)","category":"Shirt","capsuleTags":["Refined","Crossover"],"formalityScore":5,"image":"/images/wardrobe/ocbd-linen-deep-navy.png","brand":"Banana Republic"},
  {"id":"ocbd-slate","name":"OCBD (Slate)","category":"Shirt","capsuleTags":["Refined"],"formalityScore":7,"image":"/images/wardrobe/ocbd-slate.png","brand":"Polo Ralph Lauren"},
  {"id":"ocbd-white","name":"OCBD (White)","category":"Shirt","capsuleTags":["Refined"],"formalityScore":7,"image":"/images/wardrobe/ocbd-white.png","brand":"Banana Republic"},
  {"id":"ocbd-white-linen","name":"Linen Shirt (White)","category":"Shirt","capsuleTags":["Refined","Shorts"],"formalityScore":5,"image":"/images/wardrobe/ocbd-linen-white.png","brand":"Banana Republic"},
  {"id":"ocbd-white-navy-linen-striped","name":"Striped Linen Shirt (White/Navy)","category":"Shirt","capsuleTags":["Refined","Crossover","Shorts"],"formalityScore":5,"image":"/images/wardrobe/ocbd-striped.png","brand":"Banana Republic"},
  {"id":"omega-300m","name":"Seamaster 300M (Blue Dial)","category":"Watch","brand":"Omega","capsuleTags":["Refined","Sport"],"formalityScore":7,"image":"/images/wardrobe/omega-seamaster-diver-300m.png"},
  {"id":"omega-300m-rose-gold","name":"Seamaster 300M (Blue Dial, Rose Gold)","category":"Watch","brand":"Omega","capsuleTags":["Refined","Sport"],"formalityScore":7,"image":"/images/wardrobe/omega-seamaster-diver-300m-rose-gold.png"},
  {"id":"omega-nttd","name":"Seamaster No Time To Die","category":"Watch","brand":"Omega","capsuleTags":["Crossover"],"formalityScore":6,"image":"/images/wardrobe/omega-nttd.png"},
  {"id":"panerai-luminor","name":"Luminor (Brown Strap)","category":"Watch","brand":"Panerai","capsuleTags":["Adventurer"],"formalityScore":5,"image":"/images/wardrobe/luminor-panerai.png"},
  {"id":"pea-coat-black","name":"Pea Coat (Black)","category":"Jacket/Overshirt","capsuleTags":["Refined","Crossover"],"formalityScore":7,"image":"/images/wardrobe/pea-coat-black.png","brand":"Banana Republic"},
  {"id":"polo-black","name":"Polo (Black)","category":"Shirt","capsuleTags":["Refined"],"formalityScore":5,"image":"/images/wardrobe/polo-black.png","brand":"Banana Republic"},
  {"id":"polo-grey-knit","name":"Knit Polo (Grey)","category":"Shirt","capsuleTags":["Refined"],"formalityScore":5,"image":"/images/wardrobe/polo-grey.png","brand":"Banana Republic"},
  {"id":"polo-navy-ribbed","name":"Ribbed Polo (Navy)","category":"Shirt","capsuleTags":["Refined"],"formalityScore":5,"image":"/images/wardrobe/polo-navy.png","brand":"Banana Republic"},
  {"id":"quarterzip-black","name":"Quarterzip (Black)","category":"Shirt","capsuleTags":["Refined"],"formalityScore":7,"image":"/images/wardrobe/quarterzip-black.png","brand":"Polo Ralph Lauren"},
  {"id":"quarterzip-grey","name":"Quarterzip (Grey)","category":"Shirt","capsuleTags":["Refined"],"formalityScore":7,"image":"/images/wardrobe/quarterzip-grey.png","brand":"Polo Ralph Lauren"},
  {"id":"quarterzip-navy","name":"Quarterzip (Navy)","category":"Shirt","capsuleTags":["Refined"],"formalityScore":7,"image":"/images/wardrobe/quarterzip-navy.png","brand":"Polo Ralph Lauren"},
  {"id":"quarterzip-tan","name":"Quarterzip (Tan)","category":"Shirt","capsuleTags":["Refined"],"formalityScore":7,"image":"/images/wardrobe/quarterzip-tan.png","brand":"Polo Ralph Lauren"},
  {"id":"rolex-black","name":"Submariner (Black)","category":"Watch","brand":"Rolex","capsuleTags":["Refined"],"formalityScore":8,"image":"/images/wardrobe/role-submariner-black.png"},
  {"id":"rolex-cellini-moonphase","name":"Cellini Moonphase","category":"Watch","brand":"Rolex","capsuleTags":["Refined","Shorts"],"formalityScore":8,"image":"/images/wardrobe/rolex-panda.png"},
  {"id":"rolex-panda","name":"Daytona (Panda)","category":"Watch","brand":"Rolex","capsuleTags":["Refined","Shorts"],"formalityScore":8,"image":"/images/wardrobe/rolex-panda.png"},
  {"id":"shacket-beige","name":"Shacket (Beige)","category":"Jacket/Overshirt","capsuleTags":["Crossover"],"formalityScore":4,"image":"/images/wardrobe/shacket-cream.png","brand":"Banana Republic"},
  {"id":"shacket-olive","name":"Shacket (Olive)","category":"Jacket/Overshirt","capsuleTags":["Crossover"],"formalityScore":4,"image":"/images/wardrobe/shacket-olive.png","brand":"Banana Republic"},
  {"id":"shorts-dark-brown","name":"Shorts (Dark Brown)","category":"Pants","capsuleTags":["Shorts"],"formalityScore":2,"image":"/images/wardrobe/shorts-brown.png"},
  {"id":"shorts-khaki","name":"Shorts (Khaki)","category":"Pants","capsuleTags":["Shorts"],"formalityScore":2,"image":"/images/wardrobe/shorts-khaki.png","brand":"Perry Ellis"},
  {"id":"shorts-olive","name":"Shorts (Olive)","category":"Pants","capsuleTags":["Shorts"],"formalityScore":2,"image":"/images/wardrobe/shorts-olive.png","brand":"Ben Sherman"},
  {"id":"shorts-navy","name":"Shorts (Navy)","category":"Pants","capsuleTags":["Shorts"],"formalityScore":2,"image":"/images/wardrobe/navy-shorts.png","brand":"Banana Republic"},
  {"id":"shorts-white","name":"Shorts (White)","category":"Pants","capsuleTags":["Shorts"],"formalityScore":2,"image":"/images/wardrobe/shorts-white.png","brand":"Banana Republic"},
  {"id":"sneakers-killshots","name":"Killshots (White/Navy)","category":"Shoes","capsuleTags":["Crossover","Shorts"],"formalityScore":2,"image":"/images/wardrobe/sneakers-killshots.png","brand":"Nike"},
  {"id":"sneakers-white-leather","name":"Leather Sneakers (White)","category":"Shoes","capsuleTags":["Refined","Crossover","Shorts"],"formalityScore":3,"image":"/images/wardrobe/sneakers-white-leather.png","brand":"Thursday Boot Company"},
  {"id":"sweater-cableknit-white","name":"Cableknit Sweater (White)","category":"Jacket/Overshirt","capsuleTags":["Refined"],"formalityScore":6,"image":"/images/wardrobe/sweater-cableknit-white.png","brand":"Banana Republic"},
  {"id":"sweater-camel-crewneck","name":"Crewneck (Camel)","category":"Jacket/Overshirt","capsuleTags":["Refined"],"formalityScore":6,"image":"/images/wardrobe/sweater-orange.png","brand":"Banana Republic"},
  {"id":"sweater-waffleknit-blue","name":"Waffleknit Sweater (Blue)","category":"Jacket/Overshirt","capsuleTags":["Refined"],"formalityScore":6,"image":"/images/wardrobe/sweater-waffleknit-blue.png","brand":"Banana Republic"},
  {"id":"tee-black","name":"Tee (Black)","category":"Undershirt","capsuleTags":["Crossover","Adventurer"],"formalityScore":2,"image":"/images/wardrobe/polo-black.png","brand":"Banana Republic"},
  {"id":"tee-cream","name":"Tee (Cream)","category":"Undershirt","capsuleTags":["Crossover","Adventurer","Refined"],"formalityScore":2,"image":"/images/wardrobe/tee-cream.png","brand":"Banana Republic"},
  {"id":"tee-grey","name":"Tee (Grey)","category":"Undershirt","capsuleTags":["Crossover"],"formalityScore":2,"image":"/images/wardrobe/tee-grey.png","brand":"Banana Republic"},
  {"id":"tee-navy","name":"Tee (Navy)","category":"Undershirt","capsuleTags":["Crossover","Refined"],"formalityScore":2,"image":"/images/wardrobe/tee-navy.png","brand":"Banana Republic"},
  {"id":"tee-olive","name":"Tee (Olive)","category":"Undershirt","capsuleTags":["Crossover","Refined"],"formalityScore":2,"image":"/images/wardrobe/tee-olive.png","brand":"Banana Republic"},
  {"id":"tee-white","name":"Tee (White)","category":"Undershirt","capsuleTags":["Crossover","Adventurer","Refined"],"formalityScore":2,"image":"/images/wardrobe/tee-white.png","brand":"Banana Republic"},
  {"id":"trench-coat-khaki","name":"Trench Coat (Khaki)","category":"Jacket/Overshirt","capsuleTags":["Refined","Crossover"],"formalityScore":7,"image":"/images/wardrobe/trench-coat-khaki.png","brand":"Banana Republic"},
  {"id":"trousers-charcoal","name":"Wool Trousers (Charcoal)","category":"Pants","capsuleTags":["Refined"],"formalityScore":8,"image":"/images/wardrobe/trousers-charcoal.png","brand":"Banana Republic"},
  {"id":"trousers-white","name":"Trousers (White)","category":"Pants","capsuleTags":["Refined"],"formalityScore":7,"image":"/images/wardrobe/trousers-white.png","brand":"Polo Ralph Lauren"}
];

// Outfit data from src/data/outfits.json (first 10 outfits for seeding)
const outfitData: DefaultOutfit[] = [
  {"id":"o-001","name":"Outfit 001","items":["mac-coat-navy","polo-navy-ribbed","chinos-white","loafers-dark-brown-suede","belt-braided","rolex-panda"],"tuck":"Tucked","weight":2,"loved":true},
  {"id":"o-002","name":"Outfit 002","items":["mac-coat-navy","ocbd-blue","chinos-light-grey","loafers-dark-brown","belt-clean-brown","omega-300m"],"tuck":"Tucked","weight":2,"loved":true},
  {"id":"o-003","name":"Outfit 003","items":["shacket-beige","polo-grey-knit","chinos-khaki","loafers-light-tan","belt-braided","panerai-luminor"],"tuck":"Tucked"},
  {"id":"o-004","name":"Outfit 004","items":["sweater-camel-crewneck","ocbd-blue","trousers-charcoal","loafers-dark-brown","belt-reversible","rolex-panda"],"tuck":"Tucked"},
  {"id":"o-005","name":"Outfit 005","items":["ocbd-white-linen","chinos-white","loafers-light-tan","rolex-panda"],"tuck":"Untucked","loved":true},
  {"id":"o-006","name":"Outfit 006","items":["moto-jacket","tee-cream","denim-dark","boots-brown-apache","belt-rugged","omega-nttd"],"tuck":"Tucked"},
  {"id":"o-007","name":"Outfit 007","items":["ocbd-white-navy-linen-striped","jeans-medium","sneakers-killshots","belt-braided","omega-300m"],"tuck":"Tucked"},
  {"id":"o-008","name":"Outfit 008","items":["moto-jacket","tee-white","chinos-olive","boots-brown-apache","belt-rugged","panerai-luminor"],"tuck":"Tucked"},
  {"id":"o-009","name":"Outfit 009","items":["moto-jacket","henley-grey-knit","chinos-black","boots-brown-apache","belt-rugged","omega-nttd"],"tuck":"Untucked"},
  {"id":"o-010","name":"Outfit 010","items":["shacket-olive","tee-white","chinos-navy","sneakers-killshots","belt-braided","rolex-panda"],"tuck":"Tucked"},
  {"id":"o-011","name":"Outfit 011","items":["ocbd-white","chinos-khaki","sneakers-killshots","belt-clean-brown","omega-300m"],"tuck":"Tucked"}
];

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

    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user } } = await supabaseClient.auth.getUser(token)

    if (!user) {
      return createCorsResponse(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } },
        origin
      )
    }

    // Check if user already has categories (avoid duplicate seeding)
    const { data: existingCategories } = await supabaseClient
      .from('categories')
      .select('id')
      .eq('user_id', user.id)
      .limit(1)

    if (existingCategories && existingCategories.length > 0) {
      return createCorsResponse(
        JSON.stringify({ message: 'User already seeded', skipped: true }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
        origin
      )
    }

    // Insert default categories
    const { data: categories, error: categoriesError } = await supabaseClient
      .from('categories')
      .insert(
        defaultCategories.map(cat => ({
          ...cat,
          user_id: user.id,
        }))
      )
      .select()

    if (categoriesError) {
      throw new Error(`Failed to create categories: ${categoriesError.message}`)
    }

    // Create category name to ID mapping
    const categoryMap = new Map<string, string>()
    categories.forEach(cat => {
      categoryMap.set(cat.name, cat.id)
    })

    // Insert wardrobe items from JSON data (let database generate UUIDs)
    const wardrobeItemsToInsert = wardrobeData.map(item => {
      const categoryId = categoryMap.get(item.category)
      if (!categoryId) {
        throw new Error(`Category not found: ${item.category}`)
      }

      return {
        // Don't specify id - let database generate UUID
        user_id: user.id,
        category_id: categoryId,
        name: item.name,
        brand: item.brand,
        color: extractColor(item.name),
        formality_score: item.formalityScore,
        capsule_tags: item.capsuleTags,
        season: mapSeason(item.capsuleTags),
        image_url: item.image,
        active: true,
      }
    })

    const { data: wardrobeItems, error: itemsError } = await supabaseClient
      .from('wardrobe_items')
      .insert(wardrobeItemsToInsert)
      .select()

    if (itemsError) {
      throw new Error(`Failed to create wardrobe items: ${itemsError.message}`)
    }

    // Create a map of original item IDs to database UUIDs
    const itemIdMap = new Map<string, string>()
    wardrobeItems.forEach((item, index) => {
      const originalId = wardrobeData[index].id
      itemIdMap.set(originalId, item.id)
    })

    // Insert sample outfits without scores first
    const outfitsToInsert = outfitData.map(outfit => ({
      user_id: user.id,
      name: outfit.name,
      tuck_style: outfit.tuck || 'Untucked',
      weight: outfit.weight || 1,
      loved: outfit.loved || false,
      source: 'curated' as const,
      score: 0, // Will be updated after scoring
    }))

    const { data: outfits, error: outfitsError } = await supabaseClient
      .from('outfits')
      .insert(outfitsToInsert)
      .select()

    if (outfitsError) {
      throw new Error(`Failed to create outfits: ${outfitsError.message}`)
    }

    // Insert outfit items (linking outfits to wardrobe items)
    const outfitItemsToInsert: any[] = []
    for (let i = 0; i < outfits.length; i++) {
      const outfit = outfits[i]
      const outfitData_item = outfitData[i]
      
      for (const originalItemId of outfitData_item.items) {
        const wardrobeItemId = itemIdMap.get(originalItemId)
        if (wardrobeItemId) {
          const wardrobeItem = wardrobeItems.find(wi => wi.id === wardrobeItemId)
          if (wardrobeItem) {
            outfitItemsToInsert.push({
              outfit_id: outfit.id,
              item_id: wardrobeItem.id,
              category_id: wardrobeItem.category_id,
            })
          }
        }
      }
    }

    const { error: outfitItemsError } = await supabaseClient
      .from('outfit_items')
      .insert(outfitItemsToInsert)

    if (outfitItemsError) {
      throw new Error(`Failed to create outfit items: ${outfitItemsError.message}`)
    }

    // Now calculate and update scores for each outfit
    for (let i = 0; i < outfits.length; i++) {
      const outfit = outfits[i]
      const outfitData_item = outfitData[i]
      
      // Get the database item IDs for this outfit
      const dbItemIds = outfitData_item.items
        .map(originalId => itemIdMap.get(originalId))
        .filter(id => id !== undefined) as string[]

      if (dbItemIds.length > 0) {
        let score = 0
        try {
          const { data: scoreData, error: scoreError } = await supabaseClient.functions.invoke('score-outfit', {
            body: { 
              item_ids: dbItemIds,
              user_id: user.id 
            }
          })
          
          if (scoreError) {
            console.warn(`Scoring Edge Function error for outfit ${outfit.id}: ${scoreError.message}`)
            score = Math.min(dbItemIds.length * 15, 100) // Fallback scoring
          } else if (scoreData?.score !== undefined) {
            score = scoreData.score
            console.log(`Calculated score for outfit ${outfit.id}: ${score}`)
          } else {
            console.warn(`No score returned for outfit ${outfit.id}, using fallback`)
            score = Math.min(dbItemIds.length * 15, 100) // Fallback scoring
          }
        } catch (error) {
          console.warn(`Scoring failed for outfit ${outfit.id}, using fallback:`, error)
          score = Math.min(dbItemIds.length * 15, 100) // Fallback scoring
        }

        // Update the outfit with the calculated score
        await supabaseClient
          .from('outfits')
          .update({ score })
          .eq('id', outfit.id)
      }
    }

    return createCorsResponse(
      JSON.stringify({
        message: 'User seeded successfully',
        categories: categories.length,
        wardrobe_items: wardrobeItems.length,
        outfits: outfits.length,
        outfit_items: outfitItemsToInsert.length,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
      origin
    )

  } catch (error) {
    console.error('Seed user error:', error)
    return createCorsResponse(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
        origin
      )
  }
})