'use client';

import { createLogger } from '@/lib/utils/logger';

const logger = createLogger({ component: 'app-outfits-create-create-outfit-client' });
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useCategories } from '@/lib/hooks/use-categories';
import { useWardrobeItems } from '@/lib/hooks/use-wardrobe-items';
import { useCreateOutfit, useScoreOutfit, useCheckOutfitDuplicate } from '@/lib/hooks/use-outfits';
import { ItemsGridWithErrorBoundary as ItemsGrid } from '@/components/dynamic/items-grid-dynamic';
import { OutfitDisplayWithErrorBoundary as OutfitDisplay } from '@/components/dynamic/outfit-display-dynamic';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { StickyActionBar } from '@/components/ui/sticky-action-bar';
import { 
  Save, 
  X, 
  AlertCircle,
  Shirt,
  Heart,
  RefreshCw
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { OutfitSelection, WardrobeItem } from '@/lib/types/database';
import { NavigationButtons } from '@/components/navigation-buttons';
import Link from 'next/link';
import {
  getOutfitSlotForCategoryName,
  getSelectableCategoryIdsWithItems,
  hasCompleteOutfitSelection,
} from '@/lib/utils/outfit-coverage';

export function CreateOutfitPageClient() {
  const router = useRouter();
  const outfitPreviewRef = useRef<HTMLDivElement>(null);
  
  const [selection, setSelection] = useState<OutfitSelection>({
    tuck_style: 'Untucked'
  });
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [outfitName, setOutfitName] = useState('');
  const [tuckStyle, setTuckStyle] = useState<'Tucked' | 'Untucked'>('Untucked');
  
  // Sync tuck style with selection
  const handleTuckStyleChange = (newTuckStyle: 'Tucked' | 'Untucked') => {
    setTuckStyle(newTuckStyle);
    setSelection(prev => ({
      ...prev,
      tuck_style: newTuckStyle
    }));
  };
  const [isLoved, setIsLoved] = useState(false);

  // Fetch data
  const { data: categories = [], isLoading: categoriesLoading } = useCategories();
  const { data: items = [], isLoading: itemsLoading } = useWardrobeItems();
  
  // Mutations and queries
  const createOutfitMutation = useCreateOutfit();
  
  // Reset mutation state on mount to prevent stale success messages
  useEffect(() => {
    createOutfitMutation.reset();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  
  // Get selected item IDs for scoring and duplicate checking
  const selectedItemIds = useMemo(() => {
    return Object.entries(selection)
      .filter(([key, item]) => key !== 'tuck_style' && key !== 'score' && item !== null && item !== undefined)
      .map(([, item]) => (item as WardrobeItem).id)
      .filter(id => id && typeof id === 'string'); // Ensure valid IDs
  }, [selection]);

  // Track if form has unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    return selectedItemIds.length > 0 || outfitName.trim() !== '' || isLoved;
  }, [selectedItemIds.length, outfitName, isLoved]);

  // Warn before navigation with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Don't warn if mutation succeeded or is currently saving
      if (createOutfitMutation.isSuccess || createOutfitMutation.isPending) {
        return;
      }
      
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges, createOutfitMutation.isSuccess, createOutfitMutation.isPending]);

  // Check if outfit meets minimum requirements (shirt + pants)
  const hasMinimumOutfit = useMemo(() => hasCompleteOutfitSelection(selection), [selection]);

  const { data: scoreData } = useScoreOutfit(selectedItemIds);
  // Disable duplicate check while mutation is pending or successful
  const { data: isDuplicate, error: duplicateCheckError } = useCheckOutfitDuplicate(
    createOutfitMutation.isPending || createOutfitMutation.isSuccess ? [] : selectedItemIds
  );

  // Group items by category
  const itemsByCategory = useMemo(() => {
    const grouped = new Map<string, WardrobeItem[]>();
    
    categories.forEach(category => {
      const categoryItems = items.filter(item => item.category_id === category.id);
      grouped.set(category.id, categoryItems);
    });
    
    return grouped;
  }, [items, categories]);

  // Create category map for O(1) lookups
  const categoryMap = useMemo(() => {
    return new Map(categories.map(cat => [cat.id, cat]));
  }, [categories]);

  const selectableCategoryIds = useMemo(
    () => new Set(getSelectableCategoryIdsWithItems(categories, items)),
    [categories, items]
  );

  const selectableCategories = useMemo(
    () => categories.filter((category) => selectableCategoryIds.has(category.id)),
    [categories, selectableCategoryIds]
  );

  useEffect(() => {
    if (selectedCategory && !selectableCategoryIds.has(selectedCategory)) {
      setSelectedCategory('');
    }
  }, [selectedCategory, selectableCategoryIds]);

  // Get items for selected category
  const selectedCategoryItems = useMemo(() => {
    if (!selectedCategory) return [];
    return itemsByCategory.get(selectedCategory) || [];
  }, [itemsByCategory, selectedCategory]);

  const slotItems = useMemo(() => {
    const grouped: Partial<Record<Exclude<keyof OutfitSelection, 'tuck_style' | 'score' | 'loved'>, WardrobeItem[]>> = {};

    for (const item of items) {
      const category = categoryMap.get(item.category_id);
      if (!category) continue;

      const slot = getOutfitSlotForCategoryName(category.name);
      if (!slot) continue;

      grouped[slot] = [...(grouped[slot] ?? []), item];
    }

    return grouped;
  }, [items, categoryMap]);

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
  };

  const pickRandomItem = (availableItems?: WardrobeItem[]) => {
    if (!availableItems || availableItems.length === 0) {
      return undefined;
    }

    return availableItems[Math.floor(Math.random() * availableItems.length)];
  };

  const handleRandomizeSelection = () => {
    const tops = slotItems.shirt ?? [];
    const bottoms = slotItems.pants ?? [];
    const dresses = slotItems.dress ?? [];
    const shoes = slotItems.shoes ?? [];

    const canBuildSeparates = tops.length > 0 && bottoms.length > 0 && shoes.length > 0;
    const canBuildDress = dresses.length > 0 && shoes.length > 0;

    if (!canBuildSeparates && !canBuildDress) {
      return;
    }

    const shouldUseDress =
      canBuildDress && (!canBuildSeparates || Math.random() >= 0.5);

    const nextSelection: OutfitSelection = {
      tuck_style: tuckStyle,
    };

    if (shouldUseDress) {
      nextSelection.dress = pickRandomItem(dresses);
      nextSelection.shoes = pickRandomItem(shoes);
    } else {
      nextSelection.shirt = pickRandomItem(tops);
      nextSelection.pants = pickRandomItem(bottoms);
      nextSelection.shoes = pickRandomItem(shoes);
    }

    const optionalSlots: Array<keyof typeof slotItems> = ['jacket', 'overshirt', 'undershirt', 'belt', 'watch', 'accessory'];

    for (const slot of optionalSlots) {
      if (Math.random() >= 0.5) {
        const randomItem = pickRandomItem(slotItems[slot]);
        if (randomItem) {
          nextSelection[slot] = randomItem;
        }
      }
    }

    setSelection(nextSelection);
    setSelectedCategory('');
  };

  const handleItemSelect = (item: WardrobeItem | null) => {
    const category = categoryMap.get(selectedCategory);
    if (category) {
      const propertyName = getOutfitSlotForCategoryName(category.name) as keyof OutfitSelection | null;
      if (propertyName && propertyName !== 'tuck_style' && propertyName !== 'score') {
        setSelection(prev => {
          if (item) {
            return {
              ...prev,
              [propertyName]: item,
            };
          }

          const next = { ...prev };
          delete next[propertyName];
          return next;
        });

        const isMobileViewport =
          typeof window !== 'undefined' &&
          typeof window.matchMedia === 'function' &&
          window.matchMedia('(max-width: 1023px)').matches;

        if (item && isMobileViewport) {
          setSelectedCategory('');
          requestAnimationFrame(() => {
            outfitPreviewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          });
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!hasMinimumOutfit) {
      return;
    }

    // Prevent double submission
    if (createOutfitMutation.isPending) {
      return;
    }

    const outfitData = {
      name: outfitName.trim() || undefined,
      tuck_style: tuckStyle,
      loved: isLoved,
      source: 'curated' as const,
      items: selectedItemIds,
    };

    try {
      await createOutfitMutation.mutateAsync(outfitData);
      // Navigation: Use window.location for reliable redirect after successful save
      // This avoids Next.js router state issues
      window.location.href = '/outfits';
    } catch (error) {
      logger.error('Failed to create outfit:', error);
      // Error will be shown by the error alert - don't navigate
    }
  };

  const handleCancel = () => {
    router.push('/outfits');
  };

  const isFormValid = hasMinimumOutfit;
  const currentScore = scoreData?.score || 0;
  const canRandomizeSelection = useMemo(() => {
    const hasSeparates =
      (slotItems.shirt?.length ?? 0) > 0 &&
      (slotItems.pants?.length ?? 0) > 0 &&
      (slotItems.shoes?.length ?? 0) > 0;
    const hasDressLook =
      (slotItems.dress?.length ?? 0) > 0 &&
      (slotItems.shoes?.length ?? 0) > 0;

    return hasSeparates || hasDressLook;
  }, [slotItems]);
  const categoryButtonClass = (isSelected: boolean) =>
    [
      'rounded-[var(--radius-pill)] border px-[14px] py-[9px] text-[0.76rem] font-medium transition-[transform,background-color,border-color,color,box-shadow] duration-[var(--duration-fast)] ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      isSelected
        ? 'border-transparent bg-[linear-gradient(135deg,var(--accent),#7eb8ff)] text-[var(--text-on-accent)] shadow-[var(--shadow-accent)]'
        : 'border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-2)] backdrop-blur-[var(--blur-glass)] [-webkit-backdrop-filter:blur(var(--blur-glass))] hover:-translate-y-px hover:border-[var(--border-strong)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-1)]',
    ].join(' ');

  // Update selection with current score for real-time updates
  const selectionWithScore = useMemo(() => ({
    ...selection,
    score: currentScore
  }), [selection, currentScore]);

  if (categoriesLoading || itemsLoading) {
    return (
      <div className="flex-1 w-full max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-border mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading wardrobe…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 py-6 sm:px-6">
      <form onSubmit={handleSubmit} className="flex flex-col gap-6 pb-28">
        {/* Navigation */}
        <NavigationButtons 
          backTo={{ href: '/outfits', label: 'Back to Outfits' }}
        />

        {/* Header */}
        <div className="space-y-2">
          <div>
            <h1 className="font-display text-4xl font-normal tracking-[-0.03em] text-foreground">
              Create New Outfit
            </h1>
            <p className="mt-1 text-[var(--text-2)]">
              Select items from your wardrobe to create an outfit
            </p>
          </div>
        </div>

        {/* Error Messages */}
        {createOutfitMutation.isError && (
          <Alert variant="destructive" className="hidden lg:flex">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to create outfit: {createOutfitMutation.error?.message}
            </AlertDescription>
          </Alert>
        )}

        {isDuplicate && !createOutfitMutation.isSuccess && (
          <Alert variant="destructive" className="hidden lg:flex">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This outfit combination already exists in your collection.
            </AlertDescription>
          </Alert>
        )}

        {duplicateCheckError && (
          <Alert variant="warning" className="hidden lg:flex">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Unable to check for duplicate outfits. You can still create this outfit.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Outfit Preview */}
          <div ref={outfitPreviewRef} className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shirt className="h-5 w-5" />
                  Outfit Preview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Outfit Details */}
                <div className="space-y-3">
                  <div>
                    <label htmlFor="outfit-name" className="block text-sm font-medium text-muted-foreground mb-1">
                      Outfit Name (Optional)
                    </label>
                    <input
                      id="outfit-name"
                      type="text"
                      name="outfit-name"
                      autoComplete="off"
                      value={outfitName}
                      onChange={(e) => setOutfitName(e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring bg-card text-foreground"
                      placeholder="e.g., Business Casual…"
                      aria-label="Enter outfit name"
                    />
                  </div>

                  <div>
                    <p className="block text-sm font-medium text-muted-foreground mb-2">
                      Tuck Style
                    </p>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={tuckStyle === 'Tucked' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleTuckStyleChange('Tucked')}
                      >
                        Tucked
                      </Button>
                      <Button
                        type="button"
                        variant={tuckStyle === 'Untucked' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleTuckStyleChange('Untucked')}
                      >
                        Untucked
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant={isLoved ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setIsLoved(!isLoved)}
                      className="flex items-center gap-2"
                    >
                      <Heart className={`h-4 w-4 ${isLoved ? 'fill-current' : ''}`} />
                      {isLoved ? 'Loved' : 'Add to Favorites'}
                    </Button>
                  </div>
                </div>

                {/* Score Display */}
                {selectedItemIds.length > 0 && (
                  <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--bg-surface)_78%,transparent)] p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">
                        Current Score
                      </span>
                      <span className="font-bold text-foreground">{currentScore}/100</span>
                    </div>
                    {!hasMinimumOutfit && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                        Add shoes plus either a top and bottom or a dress to enable saving
                      </p>
                    )}
                  </div>
                )}


                {/* Selected Items Display */}
                <OutfitDisplay
                  selection={selectionWithScore}
                  onRandomize={handleRandomizeSelection}
                  hideRandomizeButton={true}
                  showCardScore={false}
                  enableCardFlip={false}
                  showCardTuckStyle={false}
                  cardTitle="Selected Items"
                />

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRandomizeSelection}
                  disabled={!canRandomizeSelection}
                  className="w-full"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Another Combination
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Category Selection and Items */}
          <div className="lg:col-span-2 space-y-6">
            {/* Category Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Select Category</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {selectableCategories.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => handleCategorySelect(category.id)}
                      className={categoryButtonClass(selectedCategory === category.id)}
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Items Grid */}
            {selectedCategory ? (
              <ItemsGrid
                category={categoryMap.get(selectedCategory)?.name || ''}
                items={selectedCategoryItems}
                selectedItem={(() => {
                  const category = categoryMap.get(selectedCategory);
                  if (!category) return undefined;
                  
                  const propertyName = getOutfitSlotForCategoryName(category.name) as keyof OutfitSelection | null;
                  return propertyName && propertyName !== 'tuck_style' && propertyName !== 'score' 
                    ? selection[propertyName] as WardrobeItem | undefined
                    : undefined;
                })()}
                onItemSelect={handleItemSelect}
                showBrand={true}
              />
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--bg-surface)_78%,transparent)]">
                    <Shirt className="h-7 w-7 text-muted-foreground" />
                  </div>
                  <h3 className="font-display text-[1.25rem] font-normal tracking-[-0.02em] text-foreground mb-2">
                    Select a Category
                  </h3>
                  <p className="text-[var(--text-2)]">
                    Choose a category above to start building your outfit.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Empty state */}
        {selectableCategories.length === 0 && (
          <div className="text-center py-12">
            <h3 className="font-display text-[1.25rem] font-normal tracking-[-0.02em] text-foreground mb-2">
              No categories found
            </h3>
            <p className="text-[var(--text-2)] mb-4">
              Add items to your wardrobe first to create outfits.
            </p>
            <Link href="/wardrobe/items">
              <Button>
                Add Wardrobe Items
              </Button>
            </Link>
          </div>
        )}

        <StickyActionBar
          topContent={
            <>
              {createOutfitMutation.isError && (
                <Alert variant="destructive" className="lg:hidden">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Failed to create outfit: {createOutfitMutation.error?.message}
                  </AlertDescription>
                </Alert>
              )}

              {isDuplicate && !createOutfitMutation.isSuccess && (
                <Alert variant="destructive" className="lg:hidden">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    This outfit combination already exists in your collection.
                  </AlertDescription>
                </Alert>
              )}

              {duplicateCheckError && (
                <Alert variant="warning" className="lg:hidden">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Unable to check for duplicate outfits. You can still create this outfit.
                  </AlertDescription>
                </Alert>
              )}
            </>
          }
        >
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={createOutfitMutation.isPending}
              className="flex-1 sm:flex-none"
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createOutfitMutation.isPending || !isFormValid}
              className="flex-1 sm:flex-none"
            >
              <Save className="mr-2 h-4 w-4" />
              {createOutfitMutation.isPending ? 'Creating…' : 'Create Outfit'}
            </Button>
        </StickyActionBar>
      </form>
    </div>
  );
}
