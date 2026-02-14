'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { useWardrobeItem, useUpdateWardrobeItem, useDeleteWardrobeItem } from '@/lib/hooks/use-wardrobe-items';
import { useCategories } from '@/lib/hooks/use-categories';
import { ImageUploadWithErrorBoundary as ImageUpload } from '@/components/dynamic/image-upload-dynamic';
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
  Tag,
  Palette,
  Shirt
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { WardrobeItem } from '@/lib/types/database';
import { NavigationButtons } from '@/components/navigation-buttons';
import { COLOR_OPTIONS, normalizeColor, isValidColor } from '@/lib/data/color-options';

interface ItemDetailPageClientProps {
  itemId: string;
}

export function ItemDetailPageClient({ itemId }: ItemDetailPageClientProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<WardrobeItem>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Fetch data
  const { data: item, isLoading: itemLoading, error: itemError } = useWardrobeItem(itemId);
  const { data: categories = [] } = useCategories();
  
  // Create category lookup map for O(1) performance
  const categoryMap = useMemo(() => {
    const map = new Map<string, typeof categories[0]>();
    categories.forEach(category => {
      map.set(category.id, category);
    });
    return map;
  }, [categories]);

  const category = item ? categoryMap.get(item.category_id) : undefined;

  // Mutations
  const updateItemMutation = useUpdateWardrobeItem();
  const deleteItemMutation = useDeleteWardrobeItem();

  // Initialize edit form when item loads
  React.useEffect(() => {
    if (item && !isEditing) {
      setEditForm({
        name: item.name,
        brand: item.brand || '',
        color: item.color || '',
        material: item.material || '',
        formality_score: item.formality_score || 5,
        capsule_tags: item.capsule_tags || [],
        season: item.season || ['All'],
        image_url: item.image_url || '',
        category_id: item.category_id,
      });
    }
  }, [item, isEditing]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    if (item) {
      setEditForm({
        name: item.name,
        brand: item.brand || '',
        color: item.color || '',
        material: item.material || '',
        formality_score: item.formality_score || 5,
        capsule_tags: item.capsule_tags || [],
        season: item.season || ['All'],
        image_url: item.image_url || '',
        category_id: item.category_id,
      });
    }
  };

  const handleSave = async () => {
    if (!item || !editForm.name?.trim()) return;

    // Normalize and validate color
    const normalizedColor = normalizeColor(editForm.color);
    if (!isValidColor(normalizedColor)) {
      console.error('Invalid color value:', editForm.color);
      return;
    }

    try {
      await updateItemMutation.mutateAsync({
        id: item.id,
        ...editForm,
        name: editForm.name.trim(),
        brand: editForm.brand?.trim() || undefined,
        color: normalizedColor || undefined,
        material: editForm.material?.trim() || undefined,
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update item:', error);
    }
  };

  const handleDelete = async () => {
    if (!item) return;

    try {
      await deleteItemMutation.mutateAsync(item.id);
      router.push('/wardrobe');
    } catch (error) {
      console.error('Failed to delete item:', error);
    }
  };

  const handleImageUpload = (imageUrl: string) => {
    setEditForm(prev => ({ ...prev, image_url: imageUrl }));
  };

  const handleTagToggle = (tag: string) => {
    setEditForm(prev => {
      const currentTags = prev.capsule_tags || [];
      const newTags = currentTags.includes(tag)
        ? currentTags.filter(t => t !== tag)
        : [...currentTags, tag];
      return { ...prev, capsule_tags: newTags };
    });
  };

  const handleSeasonToggle = (season: string) => {
    setEditForm(prev => {
      const currentSeasons = prev.season || ['All'];
      if (season === 'All') {
        return { ...prev, season: ['All'] };
      }
      
      let newSeasons = currentSeasons.includes(season)
        ? currentSeasons.filter(s => s !== season)
        : [...currentSeasons.filter(s => s !== 'All'), season];
      
      if (newSeasons.length === 0) {
        newSeasons = ['All'];
      }
      
      return { ...prev, season: newSeasons };
    });
  };

  if (itemLoading) {
    return (
      <div className="flex-1 w-full max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-border mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading item...</p>
          </div>
        </div>
      </div>
    );
  }

  if (itemError || !item) {
    return (
      <div className="flex-1 w-full max-w-4xl mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {itemError?.message || 'Item not found'}
          </AlertDescription>
        </Alert>
        <NavigationButtons 
          backTo={{ href: '/wardrobe', label: 'Back to Wardrobe' }}
          className="mt-4"
        />
      </div>
    );
  }

  const availableTags = ['Refined', 'Adventurer', 'Crossover', 'Shorts'];
  const availableSeasons = ['All', 'Spring', 'Summer', 'Fall', 'Winter'];

  return (
    <div className="flex-1 w-full max-w-4xl mx-auto p-6">
      <div className="flex flex-col gap-6">
        {/* Navigation */}
        <NavigationButtons 
          backTo={{ href: '/wardrobe', label: 'Back to Wardrobe' }}
        />

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {isEditing ? 'Edit Item' : item.name}
            </h1>
            {category && (
              <p className="text-muted-foreground mt-1">
                {category.name}
              </p>
            )}
          </div>

          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button
                  variant="outline"
                  onClick={handleCancelEdit}
                  disabled={updateItemMutation.isPending}
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={updateItemMutation.isPending || !editForm.name?.trim()}
                >
                  <Save className="mr-2 h-4 w-4" />
                  {updateItemMutation.isPending ? 'Saving...' : 'Save'}
                </Button>
              </>
            ) : (
              <>
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
        {updateItemMutation.isSuccess && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>Item updated successfully!</AlertDescription>
          </Alert>
        )}

        {updateItemMutation.isError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to update item: {updateItemMutation.error?.message}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Image Section */}
          <div className="border border-border rounded-lg bg-card shadow-sm overflow-hidden">
            {/* Image display */}
            {isEditing ? (
              <>
                {editForm.image_url && (
                  <div className="relative w-full h-96 bg-card">
                    <Image
                      src={editForm.image_url}
                      alt={`${editForm.name || 'Item'}${editForm.brand ? ` by ${editForm.brand}` : ''}`}
                      fill
                      className="object-contain p-4"
                      sizes="(max-width: 768px) 100vw, 50vw"
                      priority
                      quality={90}
                    />
                  </div>
                )}
                {/* Upload section */}
                <div className="p-4 border-t border-border">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                    <Shirt className="h-4 w-4" />
                    Item Image
                  </p>
                  <ImageUpload
                    onUpload={handleImageUpload}
                    onError={(error) => console.error('Upload error:', error)}
                  />
                </div>
              </>
            ) : (
              <>
                {/* Image display */}
                {item.image_url ? (
                  <div className="relative w-full h-96 bg-card">
                    <Image
                      src={item.image_url}
                      alt={`${item.name}${item.brand ? ` by ${item.brand}` : ''} - ${category?.name || 'wardrobe item'}`}
                      fill
                      className="object-contain p-4"
                      sizes="(max-width: 768px) 100vw, 50vw"
                      loading="lazy"
                      quality={85}
                    />
                  </div>
                ) : (
                  <div className="relative w-full h-96 bg-card flex items-center justify-center">
                    <div className="text-center">
                      <Shirt className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">No image</p>
                    </div>
                  </div>
                )}
                {/* Item info */}
                <div className="p-4 border-t border-border">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{category?.name || 'Item'}</p>
                  <p className="text-sm font-medium text-foreground">
                    {item.brand ? `${item.brand} ${item.name}` : item.name}
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Details Section */}
          <Card>
            <CardHeader>
              <CardTitle>Item Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing ? (
                <>
                  <div>
                    <p className="block text-sm font-medium text-muted-foreground mb-1">
                      Name *
                    </p>
                    <input
                      type="text"
                      value={editForm.name || ''}
                      onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring bg-card text-foreground"
                      required
                    />
                  </div>

                  <div>
                    <p className="block text-sm font-medium text-muted-foreground mb-1">
                      Brand
                    </p>
                    <input
                      type="text"
                      value={editForm.brand || ''}
                      onChange={(e) => setEditForm(prev => ({ ...prev, brand: e.target.value }))}
                      className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring bg-card text-foreground"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="block text-sm font-medium text-muted-foreground mb-1">
                        Color
                      </p>
                      <div className="relative">
                        <select
                          value={editForm.color || ''}
                          onChange={(e) => setEditForm(prev => ({ ...prev, color: e.target.value }))}
                          className="w-full py-2 pr-10 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring bg-card text-foreground appearance-none"
                          style={{
                            paddingLeft: editForm.color && COLOR_OPTIONS.find(opt => opt.value === editForm.color)?.hex ? '32px' : '12px'
                          }}
                        >
                          {COLOR_OPTIONS.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        {editForm.color && COLOR_OPTIONS.find(opt => opt.value === editForm.color)?.hex && (
                          <div 
                            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border border-border pointer-events-none"
                            style={{ backgroundColor: COLOR_OPTIONS.find(opt => opt.value === editForm.color)?.hex || 'transparent' }}
                          />
                        )}
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                          <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    <div>
                      <p className="block text-sm font-medium text-muted-foreground mb-1">
                        Material
                      </p>
                      <input
                        type="text"
                        value={editForm.material || ''}
                        onChange={(e) => setEditForm(prev => ({ ...prev, material: e.target.value }))}
                        className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring bg-card text-foreground"
                      />
                    </div>
                  </div>

                  <div>
                    <p className="block text-sm font-medium text-muted-foreground mb-1">
                      Formality Score (1-10)
                    </p>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={editForm.formality_score || 5}
                      onChange={(e) => setEditForm(prev => ({ ...prev, formality_score: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring bg-card text-foreground"
                    />
                  </div>

                  <div>
                    <p className="block text-sm font-medium text-muted-foreground mb-2">
                      Category
                    </p>
                    <select
                      value={editForm.category_id || ''}
                      onChange={(e) => setEditForm(prev => ({ ...prev, category_id: e.target.value }))}
                      className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring bg-card text-foreground"
                    >
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Brand</p>
                      <p className="text-foreground">{item.brand || 'Not specified'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Color</p>
                      {item.color ? (
                        <div className="flex items-center gap-2">
                          {COLOR_OPTIONS.find(opt => opt.value === item.color)?.hex && (
                            <div 
                              className="w-4 h-4 rounded-full border border-border"
                              style={{ backgroundColor: COLOR_OPTIONS.find(opt => opt.value === item.color)?.hex || 'transparent' }}
                            />
                          )}
                          <p className="text-foreground">
                            {COLOR_OPTIONS.find(opt => opt.value === item.color)?.label || item.color}
                          </p>
                        </div>
                      ) : (
                        <p className="text-foreground">Not specified</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Material</p>
                      <p className="text-foreground">{item.material || 'Not specified'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Formality Score</p>
                      <p className="text-foreground">{item.formality_score || 'Not set'}/10</p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tags and Seasons */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Capsule Tags */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Capsule Tags
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <div className="flex flex-wrap gap-2">
                  {availableTags.map(tag => (
                    <Button
                      key={tag}
                      variant={editForm.capsule_tags?.includes(tag) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleTagToggle(tag)}
                    >
                      {tag}
                    </Button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {item.capsule_tags && item.capsule_tags.length > 0 ? (
                    item.capsule_tags.map((tag: string) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-muted-foreground">No tags assigned</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Seasons */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Seasons
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <div className="flex flex-wrap gap-2">
                  {availableSeasons.map(season => (
                    <Button
                      key={season}
                      variant={editForm.season?.includes(season) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleSeasonToggle(season)}
                    >
                      {season}
                    </Button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {item.season && item.season.length > 0 ? (
                    item.season.map((season: string) => (
                      <Badge key={season} variant="outline">
                        {season}
                      </Badge>
                    ))
                  ) : (
                    <Badge variant="outline">All</Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Delete Confirmation Dialog */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="h-5 w-5" />
                  Delete Item
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Are you sure you want to delete &quot;{item.name}&quot;? This action cannot be undone and will remove the item from any outfits.
                </p>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={deleteItemMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={deleteItemMutation.isPending}
                  >
                    {deleteItemMutation.isPending ? 'Deleting...' : 'Delete'}
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