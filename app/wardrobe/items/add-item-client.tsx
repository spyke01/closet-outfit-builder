'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useCategories } from '@/lib/hooks/use-categories';
import { useCreateWardrobeItem } from '@/lib/hooks/use-wardrobe-items';
import { ImageUploadWithErrorBoundary as ImageUpload } from '@/components/dynamic/image-upload-dynamic';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Save, 
  X, 
  AlertCircle,
  CheckCircle,
  Tag,
  Palette,
  Shirt
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type CreateWardrobeItemForm } from '@/lib/schemas';
import { NavigationButtons } from '@/components/navigation-buttons';

export function AddItemPageClient() {
  const router = useRouter();
  const [formData, setFormData] = useState<CreateWardrobeItemForm>({
    category_id: '',
    name: '',
    brand: '',
    color: '',
    material: '',
    formality_score: 5,
    capsule_tags: [],
    season: ['All'],
    image_url: '',
    active: true,
  });

  // Fetch data
  const { data: categories = [], isLoading: categoriesLoading } = useCategories();
  
  // Mutations
  const createItemMutation = useCreateWardrobeItem();

  const handleInputChange = (field: keyof CreateWardrobeItemForm, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = (imageUrl: string) => {
    setFormData(prev => ({ ...prev, image_url: imageUrl }));
  };

  const handleTagToggle = (tag: string) => {
    setFormData(prev => {
      const currentTags = prev.capsule_tags || [];
      const newTags = currentTags.includes(tag)
        ? currentTags.filter(t => t !== tag)
        : [...currentTags, tag];
      return { ...prev, capsule_tags: newTags };
    });
  };

  const handleSeasonToggle = (season: 'All' | 'Summer' | 'Winter' | 'Spring' | 'Fall') => {
    setFormData(prev => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.category_id) {
      return;
    }

    try {
      const itemData = {
        ...formData,
        name: formData.name.trim(),
        brand: formData.brand?.trim() || undefined,
        color: formData.color?.trim() || undefined,
        material: formData.material?.trim() || undefined,
        image_url: formData.image_url || undefined,
        formality_score: formData.formality_score ?? undefined,
        capsule_tags: formData.capsule_tags ?? undefined,
        season: formData.season ?? undefined,
      };

      await createItemMutation.mutateAsync(itemData);
      router.push('/wardrobe');
    } catch (error) {
      console.error('Failed to create item:', error);
    }
  };

  const handleCancel = () => {
    router.push('/wardrobe');
  };

  const isFormValid = formData.name.trim() && formData.category_id;
  const availableTags = ['Refined', 'Adventurer', 'Crossover', 'Shorts'];
  const availableSeasons: ('All' | 'Summer' | 'Winter' | 'Spring' | 'Fall')[] = ['All', 'Spring', 'Summer', 'Fall', 'Winter'];

  if (categoriesLoading) {
    return (
      <div className="flex-1 w-full max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800 mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400">Loading categories...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full max-w-4xl mx-auto p-6">
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Navigation */}
        <NavigationButtons 
          backTo={{ href: '/wardrobe', label: 'Back to Wardrobe' }}
        />

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              Add New Item
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Add a new item to your wardrobe
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={createItemMutation.isPending}
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createItemMutation.isPending || !isFormValid}
            >
              <Save className="mr-2 h-4 w-4" />
              {createItemMutation.isPending ? 'Adding...' : 'Add Item'}
            </Button>
          </div>
        </div>

        {/* Success/Error Messages */}
        {createItemMutation.isSuccess && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>Item added successfully!</AlertDescription>
          </Alert>
        )}

        {createItemMutation.isError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to add item: {createItemMutation.error?.message}
            </AlertDescription>
          </Alert>
        )}

        {categories.length === 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No categories found. Categories will be created automatically when you add items.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Image Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shirt className="h-5 w-5" />
                Item Image
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {formData.image_url && (
                  <div className="relative w-full max-w-sm mx-auto aspect-square">
                    <Image
                      src={formData.image_url}
                      alt={`${formData.name || 'New item'}${formData.brand ? ` by ${formData.brand}` : ''}`}
                      fill
                      className="rounded-lg shadow-md object-cover"
                      sizes="(max-width: 768px) 100vw, 384px"
                      priority
                      quality={90}
                    />
                  </div>
                )}
                <ImageUpload
                  onUpload={handleImageUpload}
                  onError={(error) => console.error('Upload error:', error)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Details Section */}
          <Card>
            <CardHeader>
              <CardTitle>Item Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                  placeholder="e.g., Navy Blazer"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Category *
                </label>
                <select
                  value={formData.category_id}
                  onChange={(e) => handleInputChange('category_id', e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                  required
                >
                  <option value="">Select a category</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Brand
                </label>
                <input
                  type="text"
                  value={formData.brand || ''}
                  onChange={(e) => handleInputChange('brand', e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                  placeholder="e.g., J.Crew"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Color
                  </label>
                  <input
                    type="text"
                    value={formData.color || ''}
                    onChange={(e) => handleInputChange('color', e.target.value)}
                    className="w-full px-3 py-2 border border-stone-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                    placeholder="e.g., Navy"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Material
                  </label>
                  <input
                    type="text"
                    value={formData.material || ''}
                    onChange={(e) => handleInputChange('material', e.target.value)}
                    className="w-full px-3 py-2 border border-stone-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                    placeholder="e.g., Cotton"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Formality Score (1-10)
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={formData.formality_score || 5}
                  onChange={(e) => handleInputChange('formality_score', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-stone-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  1 = Very casual, 10 = Very formal
                </p>
              </div>
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
              <div className="flex flex-wrap gap-2">
                {availableTags.map(tag => (
                  <Button
                    key={tag}
                    type="button"
                    variant={formData.capsule_tags?.includes(tag) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleTagToggle(tag)}
                  >
                    {tag}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                Select tags that describe this item&apos;s style
              </p>
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
              <div className="flex flex-wrap gap-2">
                {availableSeasons.map(season => (
                  <Button
                    key={season}
                    type="button"
                    variant={formData.season?.includes(season) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleSeasonToggle(season)}
                  >
                    {season}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                Select when this item is appropriate to wear
              </p>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}