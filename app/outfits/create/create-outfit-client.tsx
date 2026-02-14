'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useCategories } from '@/lib/hooks/use-categories';
import { useWardrobeItems } from '@/lib/hooks/use-wardrobe-items';
import { useCreateOutfit, useScoreOutfit, useCheckOutfitDuplicate } from '@/lib/hooks/use-outfits';
import { ItemsGridWithErrorBoundary as ItemsGrid } from '@/components/dynamic/items-grid-dynamic';
import { OutfitDisplayWithErrorBoundary as OutfitDisplay } from '@/components/dynamic/outfit-display-dynamic';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Save, 
  X, 
  AlertCircle,
  Shirt,
  Star,
  Heart
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { WardrobeItem } from '@/lib/types/database';
import { NavigationButtons } from '@/components/navigation-buttons';
import Link from 'next/link';

// Define a local OutfitSelection type that matches our component needs
interface OutfitSelection {
  jacket?: WardrobeItem;
  overshirt?: WardrobeItem;
  shirt?: WardrobeItem;
  undershirt?: WardrobeItem;
  pants?: WardrobeItem;
  shoes?: WardrobeItem;
  belt?: WardrobeItem;
  watch?: WardrobeItem;
  tuck_style: 'Tucked' | 'Untucked';
  score?: number;
}

export function CreateOutfitPageClient() {
  const router = useRouter();
  
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
  const hasMinimumOutfit = useMemo(() => {
    return (selection.shirt || selection.undershirt) && selection.pants;
  }, [selection.shirt, selection.undershirt, selection.pants]);

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

  // Get items for selected category
  const selectedCategoryItems = useMemo(() => {
    if (!selectedCategory) return [];
    return itemsByCategory.get(selectedCategory) || [];
  }, [itemsByCategory, selectedCategory]);

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
  };

  const handleItemSelect = (item: WardrobeItem | null) => {
    const category = categoryMap.get(selectedCategory);
    if (category) {
      // Map category names to OutfitSelection property names
      const categoryMap: Record<string, keyof OutfitSelection> = {
        'Jacket': 'jacket',
        'Overshirt': 'overshirt', // Separate slots for Jacket and Overshirt
        'Jackets': 'jacket',
        'Overshirts': 'overshirt',
        'Shirt': 'shirt',
        'Shirts': 'shirt',
        'Undershirt': 'undershirt',
        'Undershirts': 'undershirt',
        'Pants': 'pants',
        'Shoes': 'shoes',
        'Belt': 'belt',
        'Belts': 'belt',
        'Watch': 'watch',
        'Watches': 'watch'
      };
      
      const propertyName = categoryMap[category.name];
      if (propertyName && propertyName !== 'tuck_style' && propertyName !== 'score') {
        setSelection(prev => ({
          ...prev,
          [propertyName]: item // item can be null for deselection
        }));
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
      console.error('Failed to create outfit:', error);
      // Error will be shown by the error alert - don't navigate
    }
  };

  const handleCancel = () => {
    router.push('/outfits');
  };

  const isFormValid = hasMinimumOutfit;
  const currentScore = scoreData?.score || 0;

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
            <p className="text-muted-foreground">Loading wardrobe...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto p-6">
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Navigation */}
        <NavigationButtons 
          backTo={{ href: '/outfits', label: 'Back to Outfits' }}
        />

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Create New Outfit
            </h1>
            <p className="text-muted-foreground mt-1">
              Select items from your wardrobe to create an outfit
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={createOutfitMutation.isPending}
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createOutfitMutation.isPending || !isFormValid}
            >
              <Save className="mr-2 h-4 w-4" />
              {createOutfitMutation.isPending ? 'Creating...' : 'Create Outfit'}
            </Button>
          </div>
        </div>

        {/* Error Messages */}
        {createOutfitMutation.isError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to create outfit: {createOutfitMutation.error?.message}
            </AlertDescription>
          </Alert>
        )}

        {isDuplicate && !createOutfitMutation.isSuccess && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This outfit combination already exists in your collection.
            </AlertDescription>
          </Alert>
        )}

        {duplicateCheckError && (
          <Alert variant="warning">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Unable to check for duplicate outfits. You can still create this outfit.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Outfit Preview */}
          <div className="lg:col-span-1">
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
                      placeholder="e.g., Business Casual"
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
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">
                        Outfit Score
                      </span>
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-yellow-500" />
                        <span className="font-bold text-foreground">
                          {currentScore}/100
                        </span>
                      </div>
                    </div>
                    {!hasMinimumOutfit && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                        Add a shirt and pants to enable saving
                      </p>
                    )}
                  </div>
                )}


                {/* Selected Items Display */}
                <OutfitDisplay
                  selection={selectionWithScore}
                  onRandomize={() => {}}
                />
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
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => handleCategorySelect(category.id)}
                      className={`
                        px-4 py-2 rounded-lg border transition-colors text-sm font-medium
                        ${selectedCategory === category.id
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background border-border hover:bg-muted'
                        }
                      `}
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
                  
                  const categoryPropertyMap: Record<string, keyof OutfitSelection> = {
                    'Jacket': 'jacket',
                    'Overshirt': 'overshirt', // Separate slots for Jacket and Overshirt
                    'Jackets': 'jacket',
                    'Overshirts': 'overshirt',
                    'Shirts': 'shirt',
                    'Undershirts': 'undershirt',
                    'Pants': 'pants',
                    'Shoes': 'shoes',
                    'Belts': 'belt',
                    'Watches': 'watch'
                  };
                  
                  const propertyName = categoryPropertyMap[category.name];
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
                  <Shirt className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    Select a Category
                  </h3>
                  <p className="text-muted-foreground">
                    Choose a category above to start building your outfit.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Empty state */}
        {categories.length === 0 && (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-foreground mb-2">
              No categories found
            </h3>
            <p className="text-muted-foreground mb-4">
              Add items to your wardrobe first to create outfits.
            </p>
            <Link href="/wardrobe/items">
              <Button>
                Add Wardrobe Items
              </Button>
            </Link>
          </div>
        )}
      </form>
    </div>
  );
}
