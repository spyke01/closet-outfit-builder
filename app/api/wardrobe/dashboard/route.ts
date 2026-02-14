/**
 * Dashboard API endpoint demonstrating dependency-based parallelization
 * 
 * This endpoint fetches user data, wardrobe items, categories, and statistics
 * using dependency-based parallelization for optimal performance.
 * 
 * **Validates: Requirements 4.6, 4.7**
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { executeWithDependencies } from '@/lib/utils/dependency-parallelization';
import { WardrobeItem, Category, Outfit } from '@/lib/types/database';

export const dynamic = 'force-dynamic';

interface DashboardAuthContext {
  supabase: Awaited<ReturnType<typeof createClient>>;
  user: {
    id: string;
    email?: string | null;
  };
}

interface DashboardStats {
  totalItems: number;
  totalCategories: number;
  totalOutfits: number;
  categoryBreakdown: Array<{ id: string; name: string; itemCount: number }>;
  averageItemsPerCategory: number;
}

interface DashboardActivity {
  type: 'item_added' | 'outfit_created';
  id: string;
  name: string;
  timestamp: string;
}

export async function GET() {
  try {
    const result = await executeWithDependencies({
      // Level 1: Authentication (no dependencies)
      auth: async () => {
        const supabase = await createClient();
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error || !user) {
          throw new Error('Unauthorized');
        }
        
        return { supabase, user };
      },
      
      // Level 2: Fetch data in parallel (all depend on auth)
      items: async ({ auth }: { auth?: DashboardAuthContext }) => {
        if (!auth) throw new Error('Auth context missing');
        const { data, error } = await auth.supabase
          .from('wardrobe_items')
          .select('*')
          .eq('user_id', auth.user.id)
          .eq('active', true);
        
        if (error) throw error;
        return data || [];
      },
      
      categories: async ({ auth }: { auth?: DashboardAuthContext }) => {
        if (!auth) throw new Error('Auth context missing');
        const { data, error } = await auth.supabase
          .from('categories')
          .select('*')
          .eq('user_id', auth.user.id)
          .order('display_order');
        
        if (error) throw error;
        return data || [];
      },
      
      outfits: async ({ auth }: { auth?: DashboardAuthContext }) => {
        if (!auth) throw new Error('Auth context missing');
        const { data, error } = await auth.supabase
          .from('outfits')
          .select('*')
          .eq('user_id', auth.user.id)
          .order('created_at', { ascending: false })
          .limit(10);
        
        if (error) throw error;
        return data || [];
      },
      
      preferences: async ({ auth }: { auth?: DashboardAuthContext }) => {
        if (!auth) throw new Error('Auth context missing');
        const { data } = await auth.supabase
          .from('user_preferences')
          .select('*')
          .eq('user_id', auth.user.id)
          .single();
        
        // Preferences might not exist yet, that's okay
        return data || null;
      },
      
      // Level 3: Calculate statistics (depends on items, categories, outfits)
      stats: async ({
        items,
        categories,
        outfits,
      }: {
        items?: WardrobeItem[];
        categories?: Category[];
        outfits?: Outfit[];
      }): Promise<DashboardStats> => {
        const safeItems = items ?? [];
        const safeCategories = categories ?? [];
        const safeOutfits = outfits ?? [];

        // Group items by category
        const itemsByCategory = safeItems.reduce((acc: Record<string, WardrobeItem[]>, item: WardrobeItem) => {
          const categoryId = item.category_id;
          if (!acc[categoryId]) {
            acc[categoryId] = [];
          }
          acc[categoryId].push(item);
          return acc;
        }, {} as Record<string, WardrobeItem[]>);
        
        // Calculate category statistics
        const categoryStats = safeCategories.map((category: Category) => ({
          id: category.id,
          name: category.name,
          itemCount: itemsByCategory[category.id]?.length || 0,
        }));
        
        return {
          totalItems: safeItems.length,
          totalCategories: safeCategories.length,
          totalOutfits: safeOutfits.length,
          categoryBreakdown: categoryStats,
          averageItemsPerCategory: safeCategories.length > 0 
            ? Math.round(safeItems.length / safeCategories.length) 
            : 0,
        };
      },
      
      // Level 3: Get recent activity (depends on items, outfits)
      recentActivity: async ({
        items,
        outfits,
      }: {
        items?: WardrobeItem[];
        outfits?: Outfit[];
      }): Promise<DashboardActivity[]> => {
        const safeItems = items ?? [];
        const safeOutfits = outfits ?? [];
        const recentItems = safeItems
          .sort((a: WardrobeItem, b: WardrobeItem) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 5)
          .map((item: WardrobeItem) => ({
            type: 'item_added' as const,
            id: item.id,
            name: item.name,
            timestamp: item.created_at,
          }));
        
        const recentOutfits = safeOutfits
          .slice(0, 5)
          .map((outfit: Outfit) => ({
            type: 'outfit_created' as const,
            id: outfit.id,
            name: outfit.name || 'Unnamed Outfit',
            timestamp: outfit.created_at,
          }));
        
        // Combine and sort by timestamp
        return [...recentItems, ...recentOutfits]
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 10);
      },
    });
    
    // Return dashboard data
    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: result.auth.user.id,
          email: result.auth.user.email,
        },
        items: result.items,
        categories: result.categories,
        outfits: result.outfits,
        preferences: result.preferences,
        stats: result.stats,
        recentActivity: result.recentActivity,
      },
    });
    
  } catch (error) {
    console.error('Dashboard API error:', error);
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

/**
 * Performance comparison:
 * 
 * Sequential execution:
 * auth (50ms) → items (100ms) → categories (100ms) → outfits (100ms) → 
 * preferences (100ms) → stats (10ms) → recentActivity (10ms) = 470ms
 * 
 * Dependency-based parallelization:
 * auth (50ms) → [items, categories, outfits, preferences in parallel] (100ms) → 
 * [stats, recentActivity in parallel] (10ms) = 160ms
 * 
 * Performance improvement: 2.9× faster
 */
