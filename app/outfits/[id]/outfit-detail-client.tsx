'use client';

import React, { useState, useMemo } from 'react';
import { useOutfit, useUpdateOutfit, useDeleteOutfit, useScoreOutfit, useCheckOutfitDuplicate } from '@/lib/hooks/use-outfits';
import { useCategories } from '@/lib/hooks/use-categories';
import { useWardrobeItems } from '@/lib/hooks/use-wardrobe-items';
import { OutfitFlatLayout } from '@/components/outfit-flat-layout';
import { ItemsGridWithErrorBoundary as ItemsGrid } from '@/components/dynamic/items-grid-dynamic';
import { OutfitDisplayWithErrorBoundary as OutfitDisplay } from '@/components/dynamic/outfit-display-dynamic';
import { convertOutfitToSelection } from '@/lib/utils/outfit-conversion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Edit, 
  Trash2, 
  Save, 
  X, 
  AlertCircle,
  CheckCircle,
  Heart,
  Star,
  Calendar,
  Shirt
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Outfit, WardrobeItem, OutfitSelection } from '@/lib/types/database';
import { NavigationButtons } from '@/components/navigation-buttons';

interface OutfitDetailPageClientProps {
  outfitId: string;
}

export function OutfitDetailPageClient({ outfitId }: OutfitDetailPageClientProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Outfit>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Edit mode state for item selection
  const [selection, setSelection] = useState<OutfitSelection>({
    tuck_style: 'Untucked'
  });
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  // Fetch data
  const { data: outfit, isLoading: outfitLoading, error: outfitError } = useOutfit(outfitId);
  const { data: categories = [], isLoading: categoriesLoading } = useCategories();
  const { data: items = [], isLoading: itemsLoading } = useWardrobeItems();
  
  // Mutations
  const updateOutfitMutation = useUpdateOutfit();
  const deleteOutfitMutation = useDeleteOutfit();

  // Get selected item IDs for scoring and duplicate checking (only in edit mode)
  const selectedItemIds = useMemo(() => {
    if (!isEditing) return [];
    return Object.entries(selection)
      .filter(([key, item]) => key !== 'tuck_style' && key !== 'score' && item !== null && item !== undefined)
      .map(([, item]) => (item as WardrobeItem).id);
  }, [selection, isEditing]);

  // Check if outfit meets minimum requirements (shirt + pants)
  const hasMinimumOutfit = useMemo(() => {
    if (!isEditing) return true; // Always valid when not editing
    return (selection.shirt || selection.undershirt) && selection.pants;
  }, [selection.shirt, selection.undershirt, selection.pants, isEditing]);

  // Score and duplicate checking for edit mode
  const { data: scoreData } = useScoreOutfit(selectedItemIds);
  const { data: isDuplicate } = useCheckOutfitDuplicate(selectedItemIds, outfit?.id);

  // Create category lookup map for O(1) performance
  const categoryMap = useMemo(() => {
    const map = new Map<string, typeof categories[0]>();
    categories.forEach(category => {
      map.set(category.id, category);
    });
    return map;
  }, [categories]);

  // Group items by category for edit mode
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

  // Initialize edit form when outfit loads
  React.useEffect(() => {
    if (outfit && !isEditing) {
      setEditForm({
        name: outfit.name || '',
        tuck_style: outfit.tuck_style || 'Untucked',
        loved: outfit.loved || false,
      });
    }
  }, [outfit, isEditing]);

  // Initialize selection when entering edit mode
  React.useEffect(() => {
    if (outfit && isEditing) {
      const outfitSelection = convertOutfitToSelection(outfit);
      if (outfitSelection) {
        setSelection(outfitSelection);
      }
      setEditForm({
        name: outfit.name || '',
        tuck_style: outfit.tuck_style || 'Untucked',
        loved: outfit.loved || false,
      });
    }
  }, [outfit, isEditing]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setSelectedCategory('');
    if (outfit) {
      setEditForm({
        name: outfit.name || '',
        tuck_style: outfit.tuck_style || 'Untucked',
        loved: outfit.loved || false,
      });
      // Reset selection to original outfit
      const outfitSelection = convertOutfitToSelection(outfit);
      if (outfitSelection) {
        setSelection(outfitSelection);
      }
    }
  };

  const handleSave = async () => {
    if (!outfit || !hasMinimumOutfit) return;

    try {
      // Get item IDs from current selection
      const itemIds = Object.entries(selection)
        .filter(([key, item]) => key !== 'tuck_style' && key !== 'score' && item !== null && item !== undefined)
        .map(([, item]) => (item as WardrobeItem).id);

      await updateOutfitMutation.mutateAsync({
        id: outfit.id,
        name: editForm.name?.trim() || undefined,
        tuck_style: editForm.tuck_style,
        loved: editForm.loved,
        items: itemIds, // Include the updated items
      });
      setIsEditing(false);
      setSelectedCategory('');
    } catch (error) {
      console.error('Failed to update outfit:', error);
    }
  };

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
  };

  const handleItemSelect = (item: WardrobeItem | null) => {
    const category = categoryMap.get(selectedCategory);
    if (category) {
      // Map category names to OutfitSelection property names
      const categoryMap: Record<string, keyof OutfitSelection> = {
        'Jacket': 'jacket',
        'Overshirt': 'overshirt',
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

  const handleTuckStyleChange = (newTuckStyle: 'Tucked' | 'Untucked') => {
    setEditForm(prev => ({ ...prev, tuck_style: newTuckStyle }));
    setSelection(prev => ({
      ...prev,
      tuck_style: newTuckStyle
    }));
  };

  const handleDelete = async () => {
    if (!outfit) return;

    try {
      await deleteOutfitMutation.mutateAsync(outfit.id);
      router.push('/outfits');
    } catch (error) {
      console.error('Failed to delete outfit:', error);
    }
  };

  const handleToggleLoved = async () => {
    if (!outfit) return;

    try {
      await updateOutfitMutation.mutateAsync({
        id: outfit.id,
        loved: !outfit.loved,
      });
    } catch (error) {
      console.error('Failed to update outfit:', error);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    if (!outfit || !isEditing) return;

    // Remove item from current selection
    const updatedSelection = { ...selection };
    Object.keys(updatedSelection).forEach(key => {
      if (key !== 'tuck_style' && key !== 'score') {
        const item = updatedSelection[key] as WardrobeItem;
        if (item && item.id === itemId) {
          updatedSelection[key] = undefined;
        }
      }
    });
    
    setSelection(updatedSelection);
  };

  // Convert outfit items to selection format for display components
  const displaySelection = React.useMemo(() => {
    if (!outfit) return undefined;
    if (isEditing) {
      // In edit mode, show current selection with live score
      return {
        ...selection,
        score: scoreData?.score || 0
      };
    }
    // In view mode, show original outfit
    return convertOutfitToSelection(outfit) || undefined;
  }, [outfit, isEditing, selection, scoreData]);

  if (outfitLoading || (isEditing && (categoriesLoading || itemsLoading))) {
    return (
      <div className="flex-1 w-full max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800 mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400">
              {isEditing ? 'Loading wardrobe...' : 'Loading outfit...'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (outfitError || !outfit) {
    return (
      <div className="flex-1 w-full max-w-7xl mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {outfitError?.message || 'Outfit not found'}
          </AlertDescription>
        </Alert>
        <NavigationButtons 
          backTo={{ href: '/outfits', label: 'Back to Outfits' }}
          className="mt-4"
        />
      </div>
    );
  }

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto p-6">
      <div className="flex flex-col gap-6">
        {/* Navigation */}
        <NavigationButtons 
          backTo={{ href: '/outfits', label: 'Back to Outfits' }}
        />

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              {isEditing ? 'Edit Outfit' : (outfit.name || 'Untitled Outfit')}
            </h1>
            <div className="flex items-center gap-4 mt-1">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-500" />
                <span className="text-slate-600 dark:text-slate-400">
                  Score: {outfit.score || 0}/100
                </span>
              </div>
              <Badge variant={outfit.source === 'curated' ? 'default' : 'secondary'}>
                {outfit.source === 'curated' ? 'Curated' : 'Generated'}
              </Badge>
              {outfit.loved && (
                <Badge variant="outline" className="text-red-500 border-red-500">
                  <Heart className="h-3 w-3 mr-1 fill-current" />
                  Loved
                </Badge>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button
                  variant="outline"
                  onClick={handleCancelEdit}
                  disabled={updateOutfitMutation.isPending}
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={updateOutfitMutation.isPending || !hasMinimumOutfit || isDuplicate}
                >
                  <Save className="mr-2 h-4 w-4" />
                  {updateOutfitMutation.isPending ? 'Saving...' : 'Save'}
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={handleToggleLoved}
                  disabled={updateOutfitMutation.isPending}
                >
                  <Heart className={`mr-2 h-4 w-4 ${outfit.loved ? 'fill-current text-red-500' : ''}`} />
                  {outfit.loved ? 'Unlove' : 'Love'}
                </Button>
                <Button variant="outline" onClick={handleEdit}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Success/Error Messages */}
        {updateOutfitMutation.isSuccess && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>Outfit updated successfully!</AlertDescription>
          </Alert>
        )}

        {updateOutfitMutation.isError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to update outfit: {updateOutfitMutation.error?.message}
            </AlertDescription>
          </Alert>
        )}

        {isEditing && isDuplicate && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This outfit combination already exists in your collection.
            </AlertDescription>
          </Alert>
        )}

        {isEditing && !hasMinimumOutfit && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              An outfit must have at least a shirt (or undershirt) and pants.
            </AlertDescription>
          </Alert>
        )}

        {/* Outfit Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shirt className="h-5 w-5" />
              Outfit Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditing ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Outfit Name
                  </label>
                  <input
                    type="text"
                    value={editForm.name || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
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
                      variant={editForm.tuck_style === 'Tucked' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleTuckStyleChange('Tucked')}
                    >
                      Tucked
                    </Button>
                    <Button
                      type="button"
                      variant={editForm.tuck_style === 'Untucked' ? 'default' : 'outline'}
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
                    variant={editForm.loved ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setEditForm(prev => ({ ...prev, loved: !prev.loved }))}
                    className="flex items-center gap-2"
                  >
                    <Heart className={`h-4 w-4 ${editForm.loved ? 'fill-current' : ''}`} />
                    {editForm.loved ? 'Loved' : 'Add to Favorites'}
                  </Button>
                </div>

                {/* Score Display in Edit Mode */}
                {selectedItemIds.length > 0 && (
                  <div className="p-3 bg-stone-50 dark:bg-slate-800 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Current Score
                      </span>
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-yellow-500" />
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          {scoreData?.score || 0}/100
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Created</p>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      <p className="text-slate-900 dark:text-slate-100">
                        {new Date(outfit.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Tuck Style</p>
                    <p className="text-slate-900 dark:text-slate-100">{outfit.tuck_style || 'Untucked'}</p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {isEditing ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Outfit Preview */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Outfit Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  {displaySelection && (
                    <OutfitDisplay
                      selection={displaySelection}
                      onRandomize={() => {}}
                      hideRandomizeButton={true}
                    />
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Category Selection and Items */}
            <div className="lg:col-span-2 space-y-6">
              {/* Category Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Select Category to Edit</CardTitle>
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
                  category={categoryMap.get(selectedCategory)?.name || ''}
                  items={selectedCategoryItems}
                  selectedItem={(() => {
                    const category = categoryMap.get(selectedCategory);
                    if (!category) return undefined;
                    
                    const categoryPropertyMap: Record<string, keyof OutfitSelection> = {
                      'Jacket': 'jacket',
                      'Overshirt': 'overshirt',
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
                    <Shirt className="h-16 w-16 mx-auto text-slate-400 mb-4" />
                    <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
                      Select a Category to Edit
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400">
                      Choose a category above to modify items in your outfit.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        ) : (
          /* Items List - Flat Layout for View Mode */
          <Card>
            <CardHeader>
              <CardTitle>Items in this Outfit</CardTitle>
            </CardHeader>
            <CardContent>
              <OutfitFlatLayout
                items={outfit.items || []}
                outfitScore={outfit.score || 0}
                onRemoveItem={undefined} // No removal in view mode
                isEditable={false}
              />
            </CardContent>
          </Card>
        )}

        {/* Delete Confirmation Dialog */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="h-5 w-5" />
                  Delete Outfit
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600 dark:text-slate-400 mb-4">
                  Are you sure you want to delete &quot;{outfit.name || 'Untitled Outfit'}&quot;? This action cannot be undone.
                </p>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={deleteOutfitMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={deleteOutfitMutation.isPending}
                  >
                    {deleteOutfitMutation.isPending ? 'Deleting...' : 'Delete'}
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