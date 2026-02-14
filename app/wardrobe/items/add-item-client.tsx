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
import { COLOR_OPTIONS, normalizeColor, isValidColor } from '@/lib/data/color-options';

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

  const handleInputChange = <K extends keyof CreateWardrobeItemForm>(
    field: K,
    value: CreateWardrobeItemForm[K]
  ) => {
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

    // Normalize and validate color
    const normalizedColor = normalizeColor(formData.color);
    if (!isValidColor(normalizedColor)) {
      console.error('Invalid color value:', formData.color);
      return;
    }

    try {
      const itemData = {
        ...formData,
        name: formData.name.trim(),
        brand: formData.brand?.trim() || undefined,
        color: normalizedColor || undefined,
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
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-border mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading categories...</p>
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
            <h1 className="text-3xl font-bold text-foreground">
              Add New Item
            </h1>
            <p className="text-muted-foreground mt-1">
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
          <div className="border border-border rounded-lg bg-card shadow-sm overflow-hidden">
            {/* Image display */}
            {formData.image_url && (
              <div className="relative w-full h-96 bg-card">
                <Image
                  src={formData.image_url}
                  alt={`${formData.name || 'New item'}${formData.brand ? ` by ${formData.brand}` : ''}`}
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
          </div>

          {/* Details Section */}
          <Card>
            <CardHeader>
              <CardTitle>Item Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="block text-sm font-medium text-muted-foreground mb-1">
                  Name *
                </p>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring bg-card text-foreground"
                  placeholder="e.g., Navy Blazer"
                  required
                />
              </div>

              <div>
                <p className="block text-sm font-medium text-muted-foreground mb-1">
                  Category *
                </p>
                <select
                  value={formData.category_id}
                  onChange={(e) => handleInputChange('category_id', e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring bg-card text-foreground"
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
                <p className="block text-sm font-medium text-muted-foreground mb-1">
                  Brand
                </p>
                <input
                  type="text"
                  value={formData.brand || ''}
                  onChange={(e) => handleInputChange('brand', e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring bg-card text-foreground"
                  placeholder="e.g., J.Crew"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="block text-sm font-medium text-muted-foreground mb-1">
                    Color
                  </p>
                  <div className="relative">
                    <select
                      value={formData.color || ''}
                      onChange={(e) => handleInputChange('color', e.target.value)}
                      className="w-full py-2 pr-10 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring bg-card text-foreground appearance-none"
                      style={{
                        paddingLeft: formData.color && COLOR_OPTIONS.find(opt => opt.value === formData.color)?.hex ? '32px' : '12px'
                      }}
                    >
                      {COLOR_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {formData.color && COLOR_OPTIONS.find(opt => opt.value === formData.color)?.hex && (
                      <div 
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border border-border pointer-events-none"
                        style={{ backgroundColor: COLOR_OPTIONS.find(opt => opt.value === formData.color)?.hex || 'transparent' }}
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
                    value={formData.material || ''}
                    onChange={(e) => handleInputChange('material', e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring bg-card text-foreground"
                    placeholder="e.g., Cotton"
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
                  value={formData.formality_score || 5}
                  onChange={(e) => handleInputChange('formality_score', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring bg-card text-foreground"
                />
                <p className="text-xs text-muted-foreground mt-1">
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
              <p className="text-xs text-muted-foreground mt-2">
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
              <p className="text-xs text-muted-foreground mt-2">
                Select when this item is appropriate to wear
              </p>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}
