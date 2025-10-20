'use client';

import React, { useState, useMemo } from 'react';
import { useCategories } from '@/lib/hooks/use-categories';
import { useWardrobeItems } from '@/lib/hooks/use-wardrobe-items';
import { useCreateOutfit, useScoreOutfit, useCheckOutfitDuplicate } from '@/lib/hooks/use-outfits';
import { ItemsGrid } from '@/components/items-grid';
import { OutfitDisplay } from '@/components/outfit-display';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Save, 
  X, 
  AlertCircle,
  CheckCircle,
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
  
  // Get selected item IDs for scoring and duplicate checking
  const selectedItemIds = useMemo(() => {
    return Object.entries(selection)
      .filter(([key, item]) => key !== 'tuck_style' && key !== 'score' && item !== null && item !== undefined)
      .map(([, item]) => (item as WardrobeItem).id);
  }, [selection]);

  const { data: scoreData } = useScoreOutfit(selectedItemIds);
  const { data: isDuplicate } = useCheckOutfitDuplicate(selectedItemIds);

  // Group items by category
  const itemsByCategory = useMemo(() => {
    const grouped = new Map<string, WardrobeItem[]>();
    
    categories.forEach(category => {
      const categoryItems = items.filter(item => item.category_id === category.id);
      grouped.set(category.id, categoryItems);
    });
    
    return grouped;
  }, [items, categories]);

  // Get items for selected category
  const selectedCategoryItems = useMemo(() => {
    if (!selectedCategory) return [];
    return itemsByCategory.get(selectedCategory) || [];
  }, [itemsByCategory, selectedCategory]);

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
  };

  const handleItemSelect = (item: WardrobeItem) => {
    const category = categories.find(c => c.id === item.category_id);
    if (category) {
      // Map category names to OutfitSelection property names
      const categoryMap: Record<string, keyof OutfitSelection> = {
        'Jackets': 'jacket',
        'Shirts': 'shirt',
        'Undershirts': 'undershirt',
        'Pants': 'pants',
        'Shoes': 'shoes',
        'Belts': 'belt',
        'Watches': 'watch'
      };
      
      const propertyName = categoryMap[category.name];
      if (propertyName && propertyName !== 'tuck_style' && propertyName !== 'score') {
        setSelection(prev => ({
          ...prev,
          [propertyName]: item
        }));
      }
    }
  };

  const handleItemRemove = (categoryName: string) => {
    setSelection(prev => ({
      ...prev,
      [categoryName]: null
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedItemIds.length === 0) {
      return;
    }

    try {
      const outfitData = {
        name: outfitName.trim() || undefined,
        tuck_style: tuckStyle,
        loved: isLoved,
        source: 'curated' as const,
        items: selectedItemIds,
      };

      await createOutfitMutation.mutateAsync(outfitData);
      router.push('/outfits');
    } catch (error) {
      console.error('Failed to create outfit:', error);
    }
  };

  const handleCancel = () => {
    router.push('/outfits');
  };

  const isFormValid = selectedItemIds.length > 0;
  const currentScore = scoreData?.score || 0;

  if (categoriesLoading || itemsLoading) {
    return (
      <div className="flex-1 w-full max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800 mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400">Loading wardrobe...</p>
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
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              Create New Outfit
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
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

        {/* Success/Error Messages */}
        {createOutfitMutation.isSuccess && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>Outfit created successfully!</AlertDescription>
          </Alert>
        )}

        {createOutfitMutation.isError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to create outfit: {createOutfitMutation.error?.message}
            </AlertDescription>
          </Alert>
        )}

        {isDuplicate && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This outfit combination already exists in your collection.
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
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Outfit Name (Optional)
                    </label>
                    <input
                      type="text"
                      value={outfitName}
                      onChange={(e) => setOutfitName(e.target.value)}
                      className="w-full px-3 py-2 border border-stone-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                      placeholder="e.g., Business Casual"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Tuck Style
                    </label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={tuckStyle === 'Tucked' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setTuckStyle('Tucked')}
                      >
                        Tucked
                      </Button>
                      <Button
                        type="button"
                        variant={tuckStyle === 'Untucked' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setTuckStyle('Untucked')}
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
                  <div className="p-3 bg-stone-50 dark:bg-slate-800 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Outfit Score
                      </span>
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-yellow-500" />
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          {currentScore}/100
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Selected Items Display */}
                <OutfitDisplay
                  selection={{ ...selection, tuck_style: tuckStyle }}
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
                category={categories.find(c => c.id === selectedCategory)?.name || ''}
                items={selectedCategoryItems}
                selectedItem={(() => {
                  const category = categories.find(c => c.id === selectedCategory);
                  if (!category) return undefined;
                  
                  const categoryMap: Record<string, keyof OutfitSelection> = {
                    'Jackets': 'jacket',
                    'Shirts': 'shirt',
                    'Undershirts': 'undershirt',
                    'Pants': 'pants',
                    'Shoes': 'shoes',
                    'Belts': 'belt',
                    'Watches': 'watch'
                  };
                  
                  const propertyName = categoryMap[category.name];
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
                  <Shirt className="h-16 w-16 mx-auto text-slate-400 mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
                    Select a Category
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400">
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
            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
              No categories found
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
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