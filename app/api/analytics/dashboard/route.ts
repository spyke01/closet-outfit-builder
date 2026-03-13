import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolveUserEntitlements } from '@/lib/services/billing/entitlements';
import type { AnalyticsDashboardResponse } from '@/lib/types/analytics';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const entitlements = await resolveUserEntitlements(supabase, user.id);
    const isPaidTier = entitlements.effectivePlanCode !== 'free';

    // Basic counts — visible to all tiers
    const [itemsResult, outfitsResult] = await Promise.all([
      supabase
        .from('wardrobe_items')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('active', true),
      supabase
        .from('outfits')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id),
    ]);

    const totalItems = itemsResult.count ?? 0;
    const totalOutfits = outfitsResult.count ?? 0;

    if (!isPaidTier) {
      const response: AnalyticsDashboardResponse = {
        wardrobe: { totalItems, totalOutfits, recentlyAdded: null, mostWorn: null },
        engagement: null,
        tier: 'free',
      };
      return NextResponse.json(response);
    }

    // Plus/Pro — full data
    const [
      recentlyAddedResult,
      mostWornResult,
      lovedOutfitsResult,
      outfitHistoryResult,
      todayStatsResult,
    ] = await Promise.all([
      supabase
        .from('wardrobe_items')
        .select('id, name, image_url, created_at')
        .eq('user_id', user.id)
        .eq('active', true)
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('outfit_items')
        .select('item_id, wardrobe_items!inner(id, name, image_url, user_id)')
        .eq('wardrobe_items.user_id', user.id),
      supabase
        .from('outfits')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('loved', true),
      supabase
        .from('outfits')
        .select('id, name, created_at, loved, score')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('today_ai_outfits')
        .select('id, user_saved')
        .eq('user_id', user.id),
    ]);

    // Compute most-worn items from outfit_items join
    const itemAppearances = new Map<string, { id: string; name: string; imageUrl: string | null; count: number }>();
    for (const row of mostWornResult.data || []) {
      const item = row.wardrobe_items as unknown as { id: string; name: string; image_url: string | null };
      if (!item?.id) continue;
      const existing = itemAppearances.get(item.id);
      if (existing) {
        existing.count++;
      } else {
        itemAppearances.set(item.id, { id: item.id, name: item.name, imageUrl: item.image_url, count: 1 });
      }
    }
    const mostWorn = [...itemAppearances.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map(({ id, name, imageUrl, count }) => ({ id, name, imageUrl, appearanceCount: count }));

    // Today stats
    const todayRows = todayStatsResult.data || [];
    const totalRecommendations = todayRows.length;
    const accepted = todayRows.filter((r) => r.user_saved).length;
    const acceptanceRate = totalRecommendations > 0 ? accepted / totalRecommendations : 0;

    const response: AnalyticsDashboardResponse = {
      wardrobe: {
        totalItems,
        totalOutfits,
        recentlyAdded: (recentlyAddedResult.data || []).map((item) => ({
          id: item.id,
          name: item.name,
          imageUrl: item.image_url,
          createdAt: item.created_at,
        })),
        mostWorn,
      },
      engagement: {
        savedOutfits: totalOutfits,
        lovedOutfits: lovedOutfitsResult.count ?? 0,
        outfitHistory: (outfitHistoryResult.data || []).map((o) => ({
          id: o.id,
          name: o.name,
          createdAt: o.created_at,
          loved: o.loved ?? false,
          score: o.score,
        })),
        todayStats: { totalRecommendations, accepted, acceptanceRate },
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load analytics' },
      { status: 500 }
    );
  }
}
