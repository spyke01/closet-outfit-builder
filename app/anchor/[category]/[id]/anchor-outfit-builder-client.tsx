'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useWardrobeItem, useWardrobeItems } from '@/lib/hooks/use-wardrobe-items';
import { useCategories } from '@/lib/hooks/use-categories';
import { useCreateOutfit, useScoreOutfit } from '@/lib/hooks/use-outfits';
import { OutfitDisplayWithErrorBoundary as OutfitDisplay } from '@/components/dynamic/outfit-display-dynamic';
import { ItemsGridWithErrorBoundary as ItemsGrid } from '@/components/dynamic/items-grid-dynamic';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Save, 
  Shuffle, 
  AlertCircle,
  CheckCircle,
  Star,
  Shirt,
  Info
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type WardrobeItem, type OutfitSelection } from '@/lib/types/database';
import { NavigationButtons } from '@/components/navigation-buttons';
import Link from 'next/link';

interface AnchorOutfitBuilderClientProps {
  categoryName: string;
  anchorItemId: string;
}

export function AnchorOutfitBuilderClient({ categoryName, anchorItemId }: AnchorOutfitBuilderClientProps) {
  const router = useRouter();
  const [selection, setSelection] = useState<OutfitSelection>({
    tuck_style: 'Untucked'
  });
  const [outfitName, setOutfitName] = useState('');
  const [showSaveForm, setShowSaveForm] = useState(false);

  // Fetch data
  const { data: anchorItem, isLoading: anchorLoading, error: anchorError } = useWardrobeItem(anchorItemId);
  const { data: allItems = [], isLoading: itemsLoading, error: itemsError } = useWardrobeItems();
  const { data: categories = [], isLoading: categoriesLoading, error: categoriesError } = useCategories();
  
  // Mutations
  const createOutfitMutation = useCreateOutfit();

  // Get selected item IDs for scoring
  const selectedItemIds = useMemo(() => {
    const ids: string[] = [];
    Object.values(selection).forEach(item => {
      if (item && typeof item === 'object' && 'id' in item && item.id) {
        ids.push(item.id);
      }
    });
    return ids;
  }, [selection]);

  // Score the current outfit
  const { data: scoreData } = useScoreOutfit(selectedItemIds);

  // Create category map for O(1) lookups
  const categoryMap = useMemo(() => {
    return new Map(categories.map(cat => [cat.id, cat]));
  }, [categories]);

  // Initialize selection with anchor item
  React.useEffect(() => {
    if (anchorItem && categoryMap.size > 0) {
      const category = categoryMap.get(anchorItem.category_id);
      if (category) {
        setSelection(prev => ({
          ...prev,
          [category.name]: anchorItem
        }));
      }
    }
  }, [anchorItem, categoryMap]);

  // Filter items by category, excluding the anchor item's category
  const itemsByCategory = useMemo(() => {
    if (!anchorItem) return {};
    
    const result: Record<string, WardrobeItem[]> = {};
    
    categories.forEach(category => {
      // Skip the anchor item's category since it's already selected
      if (category.id === anchorItem.category_id) return;
      
      const categoryItems = allItems.filter(item => 
        item.category_id === category.id && 
        item.active &&
        item.id !== anchorItemId
      );
      
      if (categoryItems.length > 0) {
        result[category.name] = categoryItems;
      }
    });
    
    return result;
  }, [allItems, categories, anchorItem, anchorItemId]);

  // Get available categories for selection
  const availableCategories = useMemo(() => {
    return Object.keys(itemsByCategory);
  }, [itemsByCategory]);

  const handleItemSelect = useCallback((category: string, item: WardrobeItem | null) => {
    setSelection(prev => ({
      ...prev,
      [category]: item
    }));
  }, []);

  const handleRandomize = useCallback(() => {
    const newSelection: OutfitSelection = {
      tuck_style: selection.tuck_style || 'Untucked'
    };
    
    // Keep the anchor item
    if (anchorItem && categories.length > 0) {
      const anchorCategory = categories.find(cat => cat.id === anchorItem.category_id);
      if (anchorCategory) {
        newSelection[anchorCategory.name] = anchorItem;
      }
    }
    
    // Randomly select items from other categories
    availableCategories.forEach(categoryName => {
      const items = itemsByCategory[categoryName];
      if (items && items.length > 0) {
        const randomItem = items[Math.floor(Math.random() * items.length)];
        newSelection[categoryName] = randomItem;
      }
    });
    
    setSelection(newSelection);
  }, [anchorItem, categories, availableCategories, itemsByCategory, selection.tuck_style]);

  const handleSaveOutfit = async () => {
    if (selectedItemIds.length === 0) return;
    
    try {
      const outfit = await createOutfitMutation.mutateAsync({
        name: outfitName.trim() || undefined,
        tuck_style: selection.tuck_style || 'Untucked',
        items: selectedItemIds,
        source: 'curated',
        loved: false,
        weight: 1
      });
      
      // Navigate to the created outfit
      router.push(`/outfits/${outfit.id}`);
    } catch (error) {
      console.error('Failed to save outfit:', error);
    }
  };

  if (anchorLoading || itemsLoading || categoriesLoading) {
    return (
      <div className="flex-1 w-full max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-border mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading outfit builder...</p>
          </div>
        </div>
      </div>
    );
  }

  if (anchorError || itemsError || categoriesError || !anchorItem) {
    return (
      <div className="flex-1 w-full max-w-7xl mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {anchorError?.message || itemsError?.message || categoriesError?.message || 'Anchor item not found'}
          </AlertDescription>
        </Alert>
        <NavigationButtons 
          backTo={{ 
            href: `/anchor/${encodeURIComponent(categoryName)}`, 
            label: `Back to ${categoryName} Items` 
          }}
          className="mt-4"
        />
      </div>
    );
  }

  const anchorCategory = categories.find(cat => cat.id === anchorItem.category_id);
  const currentScore = scoreData?.score || 0;

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto p-6">
      <div className="flex flex-col gap-6">
        {/* Navigation */}
        <NavigationButtons 
          backTo={{ 
            href: `/anchor/${encodeURIComponent(categoryName)}`, 
            label: `Back to ${categoryName}` 
          }}
        />

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Build Outfit
            </h1>
            <p className="text-muted-foreground mt-1">
              Using {anchorItem.name} as anchor
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            {currentScore > 0 && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Star className="h-3 w-3" />
                Score: {currentScore}/100
              </Badge>
            )}
            <Button
              variant="outline"
              onClick={handleRandomize}
              disabled={availableCategories.length === 0}
            >
              <Shuffle className="mr-2 h-4 w-4" />
              Randomize
            </Button>
            <Button
              onClick={() => setShowSaveForm(true)}
              disabled={selectedItemIds.length === 0 || createOutfitMutation.isPending}
            >
              <Save className="mr-2 h-4 w-4" />
              Save Outfit
            </Button>
          </div>
        </div>

        {/* Anchor Item Info */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Info className="h-5 w-5 text-secondary" />
              <div className="flex-1">
                <h3 className="font-medium text-foreground">
                  Anchor Item: {anchorItem.name}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {anchorCategory?.name}
                  {anchorItem.brand && ` • ${anchorItem.brand}`}
                  {anchorItem.color && ` • ${anchorItem.color}`}
                </p>
              </div>
              <Badge variant="secondary">
                Locked
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Success/Error Messages */}
        {createOutfitMutation.isSuccess && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>Outfit saved successfully!</AlertDescription>
          </Alert>
        )}

        {createOutfitMutation.isError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to save outfit: {createOutfitMutation.error?.message}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Outfit Display */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shirt className="h-5 w-5" />
                Current Outfit
              </CardTitle>
            </CardHeader>
            <CardContent>
              <OutfitDisplay
                selection={{
                  ...selection,
                  tuck_style: selection.tuck_style || 'Untucked'
                }}
                onRandomize={handleRandomize}
              />
              
              {currentScore > 0 && (
                <div className="mt-4 p-3 bg-muted rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">
                      Compatibility Score
                    </span>
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-yellow-500" />
                      <span className="font-bold text-foreground">
                        {currentScore}/100
                      </span>
                    </div>
                  </div>
                  {scoreData?.breakdown && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Based on formality, color harmony, and style compatibility
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Item Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select Items</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {availableCategories.length === 0 ? (
                <div className="text-center py-8">
                  <Shirt className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">
                    No other categories available. Add more items to your wardrobe to build complete outfits.
                  </p>
                  <Link href="/wardrobe/items" className="mt-3 inline-block">
                    <Button size="sm">Add Items</Button>
                  </Link>
                </div>
              ) : (
                availableCategories.map(categoryName => (
                  <div key={categoryName}>
                    <h4 className="font-medium text-foreground mb-2">
                      {categoryName}
                    </h4>
                    <ItemsGrid
                      items={itemsByCategory[categoryName]}
                      selectedItem={selection[categoryName] as WardrobeItem}
                      onItemSelect={(item) => handleItemSelect(categoryName, item)}
                      category={categoryName}
                    />
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Save Outfit Form */}
        {showSaveForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
              <CardHeader>
                <CardTitle>Save Outfit</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="block text-sm font-medium text-muted-foreground mb-1">
                    Outfit Name (Optional)
                  </p>
                  <input
                    type="text"
                    value={outfitName}
                    onChange={(e) => setOutfitName(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring bg-card text-foreground"
                    placeholder="e.g., Business Casual with Blue Shirt"
                  />
                </div>

                <div>
                  <p className="block text-sm font-medium text-muted-foreground mb-2">
                    Tuck Style
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={selection.tuck_style === 'Tucked' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelection(prev => ({ ...prev, tuck_style: 'Tucked' }))}
                    >
                      Tucked
                    </Button>
                    <Button
                      type="button"
                      variant={selection.tuck_style === 'Untucked' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelection(prev => ({ ...prev, tuck_style: 'Untucked' }))}
                    >
                      Untucked
                    </Button>
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setShowSaveForm(false)}
                    disabled={createOutfitMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveOutfit}
                    disabled={createOutfitMutation.isPending || selectedItemIds.length === 0}
                  >
                    {createOutfitMutation.isPending ? 'Saving...' : 'Save Outfit'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}