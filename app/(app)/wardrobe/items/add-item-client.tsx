'use client';

import { createLogger } from '@/lib/utils/logger';

const logger = createLogger({ component: 'app-wardrobe-items-add-item-client' });
import React, { useState } from 'react';
import Image from 'next/image';
import { useCategories } from '@/lib/hooks/use-categories';
import { useCreateWardrobeItem } from '@/lib/hooks/use-wardrobe-items';
import { useImageGenerationQuota } from '@/lib/hooks/use-wardrobe-item-image-generation';
import { ImageUploadWithErrorBoundary as ImageUpload } from '@/components/dynamic/image-upload-dynamic';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
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

function getFormalityGuidance(score: number): string {
  if (score <= 2) return 'Very casual: gym tee, sweats, lounge pieces';
  if (score <= 4) return 'Casual: denim, polos, everyday knitwear';
  if (score <= 6) return 'Smart casual: chinos, OCBD, casual blazer';
  if (score <= 8) return 'Business: dress shirt, trousers, tailoring';
  return 'Formal: suiting, tuxedo, eventwear';
}

export function AddItemPageClient() {
  const router = useRouter();
  const [autoGenerateOnSave, setAutoGenerateOnSave] = useState(false);
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
    bg_removal_status: 'completed',
  });

  // Fetch data
  const { data: categories = [], isLoading: categoriesLoading } = useCategories();
  
  // Mutations
  const createItemMutation = useCreateWardrobeItem();
  const { canGenerate, isFreeTier, limits, isLoading: quotaLoading } = useImageGenerationQuota();

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
      logger.error('Invalid color value:', formData.color);
      return;
    }

    try {
      const shouldAutoGenerate =
        autoGenerateOnSave &&
        !formData.image_url &&
        !isFreeTier &&
        canGenerate &&
        Boolean(normalizedColor) &&
        Boolean(formData.category_id);

      const initialBgStatus: 'pending' | 'completed' = formData.image_url
        ? 'completed'
        : shouldAutoGenerate
          ? 'pending'
          : 'completed';

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
        bg_removal_status: initialBgStatus,
      };

      const createdItem = await createItemMutation.mutateAsync(itemData);

      if (shouldAutoGenerate && createdItem?.id) {
        router.push(`/wardrobe?autogen=${createdItem.id}`);
        return;
      }

      router.push('/wardrobe');
    } catch (error) {
      logger.error('Failed to create item:', error);
    }
  };

  const handleCancel = () => {
    router.push('/wardrobe');
  };

  const canAutoGenerateForForm = Boolean(normalizeColor(formData.color)) && Boolean(formData.category_id);
  const isSubmitting = createItemMutation.isPending;
  const isFormValid = formData.name.trim() && formData.category_id;
  const formalityScore = Number(formData.formality_score ?? 5);
  const normalizedSelectedColor = normalizeColor(formData.color);
  const selectedColorOption = COLOR_OPTIONS.find(opt => opt.value === normalizedSelectedColor);
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
      <form onSubmit={handleSubmit} className="flex flex-col gap-6 pb-28">
        {/* Navigation */}
        <NavigationButtons 
          backTo={{ href: '/wardrobe', label: 'Back to Wardrobe' }}
        />

        {/* Header */}
        <div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Add New Item
            </h1>
            <p className="text-muted-foreground mt-1">
              Add a new item to your wardrobe
            </p>
          </div>
        </div>

        {/* Success/Error Messages */}
        {createItemMutation.isSuccess && (
          <Alert variant="success" className="hidden lg:flex">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>Item added successfully!</AlertDescription>
          </Alert>
        )}

        {createItemMutation.isError && (
          <Alert variant="destructive" className="hidden lg:flex">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to add item: {createItemMutation.error?.message}
            </AlertDescription>
          </Alert>
        )}

        {categories.length === 0 && (
          <Alert variant="info">
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
                onError={(error) => logger.error('Upload error:', error)}
              />
              {/* AI generation option */}
              <div className="mt-3 border-t border-border pt-3">
                <p className="text-xs text-muted-foreground mb-2">AI image generation</p>
                <div className="flex items-start justify-between gap-3 rounded-lg border border-border p-3">
                  <div className="space-y-1">
                    <Label htmlFor="auto-generate-ai-image" className="text-sm font-medium text-foreground">
                      Auto-generate AI image after save
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Save once and trigger generation automatically.
                    </p>
                    {isFreeTier && !quotaLoading && (
                      <p className="text-xs text-muted-foreground">
                        Requires Plus or Pro plan.
                      </p>
                    )}
                    {!isFreeTier && !quotaLoading && (
                      <p className="text-xs text-muted-foreground">
                        {limits.monthly_remaining} of {limits.monthly_limit} generations remaining.
                      </p>
                    )}
                    {!canAutoGenerateForForm && (
                      <p className="text-xs text-muted-foreground">
                        Select a category and color to enable this.
                      </p>
                    )}
                    {formData.image_url && (
                      <p className="text-xs text-muted-foreground">
                        Disabled when an uploaded image is already provided.
                      </p>
                    )}
                  </div>
                  <Switch
                    id="auto-generate-ai-image"
                    checked={autoGenerateOnSave}
                    onCheckedChange={setAutoGenerateOnSave}
                    className="ring-1 ring-border data-[state=unchecked]:bg-slate-500/70 dark:data-[state=unchecked]:bg-slate-300/35 data-[state=checked]:bg-green-600"
                    disabled={
                      quotaLoading ||
                      isFreeTier ||
                      !canGenerate ||
                      !canAutoGenerateForForm ||
                      Boolean(formData.image_url)
                    }
                    aria-label="Auto-generate AI image after saving item"
                  />
                </div>
              </div>
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
                      value={normalizedSelectedColor}
                      onChange={(e) => handleInputChange('color', e.target.value)}
                      className="w-full py-2 pr-10 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring bg-card text-foreground appearance-none"
                      style={{
                        paddingLeft: selectedColorOption?.hex ? '32px' : '12px'
                      }}
                    >
                      {COLOR_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {selectedColorOption?.hex && (
                      <div 
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border border-border pointer-events-none"
                        style={{ backgroundColor: selectedColorOption.hex }}
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
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Casual</span>
                    <span className="font-medium text-foreground">{formalityScore}/10</span>
                    <span className="text-muted-foreground">Formal</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="1"
                    value={formalityScore}
                    onChange={(e) => handleInputChange('formality_score', Number(e.target.value))}
                    className="w-full accent-primary"
                    aria-label="Formality score from 1 to 10"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {getFormalityGuidance(formalityScore)}
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

        <div className="sticky bottom-0 z-30 -mx-6 border-t border-border bg-background/95 px-6 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 backdrop-blur">
          <div className="mx-auto flex w-full max-w-4xl gap-2">
            {createItemMutation.isSuccess && (
              <Alert variant="success" className="lg:hidden mb-2 w-full">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>Item added successfully!</AlertDescription>
              </Alert>
            )}

            {createItemMutation.isError && (
              <Alert variant="destructive" className="lg:hidden mb-2 w-full">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Failed to add item: {createItemMutation.error?.message}
                </AlertDescription>
              </Alert>
            )}

          </div>
          <div className="mx-auto flex w-full max-w-4xl gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSubmitting}
              className="flex-1 sm:flex-none"
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !isFormValid}
              className="flex-1 sm:flex-none"
            >
              <Save className="mr-2 h-4 w-4" />
              {createItemMutation.isPending ? 'Adding...' : 'Add Item'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
