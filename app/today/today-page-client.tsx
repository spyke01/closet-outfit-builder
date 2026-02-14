'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { WardrobeItem } from '@/lib/types/database';
import { useWeather } from '@/lib/hooks/use-weather';
import { generateOutfit, regenerateOutfit, swapItem } from '@/lib/services/outfit-generator';
import { normalizeWeatherContext } from '@/lib/utils/weather-normalization';
import { GeneratedOutfit, WeatherContext } from '@/lib/types/generation';
import TodayOutfitDisplay from '@/components/today-outfit-display';
import WeatherSnapshot from '@/components/weather-snapshot';
import OutfitActions from '@/components/outfit-actions';
import { createOutfit } from '@/lib/actions/outfits';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle } from 'lucide-react';
import Link from 'next/link';

interface TodayPageClientProps {
  wardrobeItems: WardrobeItem[];
}

export default function TodayPageClient({ wardrobeItems }: TodayPageClientProps) {
  const { current, forecast, loading: weatherLoading, error: weatherError } = useWeather(true);
  
  const [currentOutfit, setCurrentOutfit] = useState<GeneratedOutfit | null>(null);
  const [recentlyUsedByCategory, setRecentlyUsedByCategory] = useState<Record<string, string[]>>({});
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  
  // Normalize weather context
  const weatherContext = useMemo<WeatherContext | null>(() => {
    if (!current || !forecast.length) {
      // Return neutral defaults if weather unavailable
      if (weatherError) {
        return {
          isCold: false,
          isMild: true,
          isWarm: false,
          isHot: false,
          isRainLikely: false,
          dailySwing: 0,
          hasLargeSwing: false,
          targetWeight: 1,
          currentTemp: 65,
          highTemp: 70,
          lowTemp: 60,
          precipChance: 0,
        };
      }
      return null;
    }
    return normalizeWeatherContext(current, forecast);
  }, [current, forecast, weatherError]);
  
  // Check for required categories
  const hasRequiredCategories = useMemo(() => {
    const categories = new Set(wardrobeItems.map(item => item.category?.name).filter(Boolean));
    return categories.has('Shirt') && categories.has('Pants') && categories.has('Shoes');
  }, [wardrobeItems]);
  
  // Generate initial outfit
  useEffect(() => {
    if (!weatherContext || !hasRequiredCategories || currentOutfit || generating) return;
    
    setGenerating(true);
    try {
      const outfit = generateOutfit({
        wardrobeItems,
        weatherContext,
        excludeItems: [],
      });
      setCurrentOutfit(outfit);
      
      // Track items by category
      const newRecentlyUsed: Record<string, string[]> = {};
      for (const [category, item] of Object.entries(outfit.items)) {
        if (item) {
          newRecentlyUsed[category] = [item.id];
        }
      }
      setRecentlyUsedByCategory(newRecentlyUsed);
    } catch (error) {
      console.error('Failed to generate initial outfit:', error);
    } finally {
      setGenerating(false);
    }
  }, [weatherContext, hasRequiredCategories, wardrobeItems, currentOutfit, generating]);
  
  // Handle regenerate
  const handleRegenerate = useCallback(() => {
    if (!weatherContext) return;
    
    setGenerating(true);
    setSaveSuccess(false);
    setSaveError(null);
    
    try {
      // Flatten all recently used items for exclusion
      const excludeItems = Object.values(recentlyUsedByCategory).flat();
      
      const outfit = regenerateOutfit({
        wardrobeItems,
        weatherContext,
        excludeItems,
      });
      setCurrentOutfit(outfit);
      
      // Update recently used by category (keep last 3 per category)
      setRecentlyUsedByCategory(prev => {
        const updated = { ...prev };
        for (const [category, item] of Object.entries(outfit.items)) {
          if (item) {
            const categoryKey = category;
            const existing = updated[categoryKey] || [];
            updated[categoryKey] = [...existing, item.id].slice(-3);
          }
        }
        return updated;
      });
    } catch (error) {
      console.error('Failed to regenerate outfit:', error);
    } finally {
      setGenerating(false);
    }
  }, [wardrobeItems, weatherContext, recentlyUsedByCategory]);
  
  // Handle swap item
  const handleSwap = useCallback((category: string) => {
    if (!weatherContext || !currentOutfit) return;
    
    try {
      const outfit = swapItem({
        currentOutfit,
        category,
        wardrobeItems,
        weatherContext,
      });
      setCurrentOutfit(outfit);
    } catch (error) {
      console.error(`Failed to swap ${category}:`, error);
    }
  }, [wardrobeItems, weatherContext, currentOutfit]);
  
  // Handle save outfit
  const handleSave = useCallback(async () => {
    if (!currentOutfit) return;
    
    setSaving(true);
    setSaveSuccess(false);
    setSaveError(null);
    
    try {
      // Build outfit data for server action
      const outfitData = {
        name: `Today's Outfit - ${new Date().toLocaleDateString()}`,
        source: 'generated',
        jacket_item_id: currentOutfit.items.jacket?.id,
        shirt_item_id: currentOutfit.items.shirt?.id,
        pants_item_id: currentOutfit.items.pants?.id,
        shoes_item_id: currentOutfit.items.shoes?.id,
        belt_item_id: currentOutfit.items.belt?.id,
        watch_item_id: currentOutfit.items.watch?.id,
        score: Math.round(currentOutfit.scores.overall.total * 100),
      };
      
      const result = await createOutfit(outfitData);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to save outfit');
      }
      
      setSaveSuccess(true);
    } catch (error) {
      console.error('Failed to save outfit:', error);
      setSaveError(error instanceof Error ? error.message : 'Failed to save outfit');
    } finally {
      setSaving(false);
    }
  }, [currentOutfit]);
  
  // Empty state
  if (!hasRequiredCategories) {
    return (
      <div className="container mx-auto p-4 pt-24">
        <h1 className="text-2xl font-bold mb-6 text-foreground">Today&apos;s Outfit</h1>
        <div className="text-center py-12">
          <p className="text-lg mb-4 text-muted-foreground">
            You need at least one Shirt, Pants, and Shoes to generate outfits.
          </p>
          <Link href="/wardrobe" className="text-primary hover:underline">
            Add items to your wardrobe →
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <h1 className="text-2xl font-bold mb-6 text-foreground">Today&apos;s Outfit</h1>
      
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left sidebar - Weather and Actions (desktop only) */}
        <div className="lg:w-80 flex-shrink-0">
          <WeatherSnapshot 
            current={current} 
            forecast={forecast}
            loading={weatherLoading}
            error={weatherError}
          />
          
          {/* Actions - hidden on mobile, shown on desktop */}
          {currentOutfit && (
            <div className="hidden lg:block">
              <OutfitActions
                onRegenerate={handleRegenerate}
                onSave={handleSave}
                disabled={generating || saving}
              />
            </div>
          )}
          
          {saveSuccess && (
            <Alert variant="success" className="mt-4">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription className="mb-2 text-sm">Outfit saved successfully!</AlertDescription>
              <Link href="/outfits" className="text-primary hover:underline text-sm">
                View your outfits →
              </Link>
            </Alert>
          )}
          
          {saveError && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="mb-2 text-sm">{saveError}</AlertDescription>
              <button
                onClick={() => handleSave()}
                className="text-destructive hover:underline text-sm"
              >
                Try again
              </button>
            </Alert>
          )}
        </div>
        
        {/* Right side - Outfit Display */}
        <div className="flex-1">
          {generating && !currentOutfit && (
            <div className="text-center py-12">
              <p className="text-lg text-muted-foreground">Generating your outfit...</p>
            </div>
          )}
          
          {currentOutfit && (
            <>
              <TodayOutfitDisplay 
                outfit={currentOutfit}
                onSwap={handleSwap}
                generating={generating}
              />
              
              {/* Actions - shown on mobile, hidden on desktop */}
              <div className="lg:hidden mt-6">
                <OutfitActions
                  onRegenerate={handleRegenerate}
                  onSave={handleSave}
                  disabled={generating || saving}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
