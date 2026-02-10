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
import Link from 'next/link';

interface TodayPageClientProps {
  wardrobeItems: WardrobeItem[];
}

export default function TodayPageClient({ wardrobeItems }: TodayPageClientProps) {
  const { current, forecast, loading: weatherLoading, error: weatherError } = useWeather(true);
  
  const [currentOutfit, setCurrentOutfit] = useState<GeneratedOutfit | null>(null);
  const [recentlyUsed, setRecentlyUsed] = useState<string[]>([]);
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
        excludeItems: recentlyUsed,
      });
      setCurrentOutfit(outfit);
      setRecentlyUsed(prev => [...prev, ...outfit.itemIds].slice(-10));
    } catch (error) {
      console.error('Failed to generate initial outfit:', error);
    } finally {
      setGenerating(false);
    }
  }, [weatherContext, hasRequiredCategories, wardrobeItems, recentlyUsed, currentOutfit, generating]);
  
  // Handle regenerate
  const handleRegenerate = useCallback(() => {
    if (!weatherContext) return;
    
    setGenerating(true);
    setSaveSuccess(false);
    setSaveError(null);
    
    try {
      const outfit = regenerateOutfit({
        wardrobeItems,
        weatherContext,
        excludeItems: recentlyUsed,
      });
      setCurrentOutfit(outfit);
      setRecentlyUsed(prev => [...prev, ...outfit.itemIds].slice(-10));
    } catch (error) {
      console.error('Failed to regenerate outfit:', error);
    } finally {
      setGenerating(false);
    }
  }, [wardrobeItems, weatherContext, recentlyUsed]);
  
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
  const handleSave = useCallback(async (loved: boolean = false) => {
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
        <h1 className="text-2xl font-bold mb-6 text-slate-900 dark:text-white">Today&apos;s Outfit</h1>
        <div className="text-center py-12">
          <p className="text-lg mb-4 text-slate-700 dark:text-slate-300">
            You need at least one Shirt, Pants, and Shoes to generate outfits.
          </p>
          <Link href="/wardrobe" className="text-blue-600 dark:text-blue-400 hover:underline">
            Add items to your wardrobe →
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <h1 className="text-2xl font-bold mb-6 text-slate-900 dark:text-white">Today&apos;s Outfit</h1>
      
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
            <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-green-800 dark:text-green-200 mb-2 text-sm">Outfit saved successfully!</p>
              <Link href="/outfits" className="text-green-600 dark:text-green-400 hover:underline text-sm">
                View your outfits →
              </Link>
            </div>
          )}
          
          {saveError && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-800 dark:text-red-200 mb-2 text-sm">{saveError}</p>
              <button
                onClick={() => handleSave(false)}
                className="text-red-600 dark:text-red-400 hover:underline text-sm"
              >
                Try again
              </button>
            </div>
          )}
        </div>
        
        {/* Right side - Outfit Display */}
        <div className="flex-1">
          {generating && !currentOutfit && (
            <div className="text-center py-12">
              <p className="text-lg text-slate-700 dark:text-slate-300">Generating your outfit...</p>
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
