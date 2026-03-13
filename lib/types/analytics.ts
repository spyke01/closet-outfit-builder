/**
 * Type definitions for the Analytics Dashboard
 */

export interface RecentlyAddedItem {
  id: string;
  name: string;
  imageUrl: string | null;
  createdAt: string;
}

export interface MostWornItem {
  id: string;
  name: string;
  imageUrl: string | null;
  appearanceCount: number;
}

export interface WardrobeStats {
  totalItems: number;
  totalOutfits: number;
  recentlyAdded: RecentlyAddedItem[] | null;
  mostWorn: MostWornItem[] | null;
}

export interface OutfitHistoryEntry {
  id: string;
  name: string;
  createdAt: string;
  loved: boolean;
  score: number | null;
}

export interface TodayStats {
  totalRecommendations: number;
  accepted: number;
  acceptanceRate: number;
}

export interface EngagementStats {
  savedOutfits: number;
  lovedOutfits: number;
  outfitHistory: OutfitHistoryEntry[];
  todayStats: TodayStats;
}

export type AnalyticsDashboardResponse =
  | {
      wardrobe: WardrobeStats;
      engagement: EngagementStats;
    }
  | {
      wardrobe: {
        totalItems: number;
        totalOutfits: number;
        recentlyAdded: null;
        mostWorn: null;
      };
      engagement: null;
      tier: 'free';
    };
