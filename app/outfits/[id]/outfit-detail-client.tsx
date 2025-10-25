'use client';

import React, { useState } from 'react';
import { useOutfit, useUpdateOutfit, useDeleteOutfit } from '@/lib/hooks/use-outfits';
import { OutfitDisplay } from '@/components/outfit-display';
import { OutfitCard } from '@/components/outfit-card';
import { OutfitFlatLayout } from '@/components/outfit-flat-layout';
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
  User,
  Shirt
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Outfit } from '@/lib/types/database';
import { NavigationButtons } from '@/components/navigation-buttons';

interface OutfitDetailPageClientProps {
  outfitId: string;
}

export function OutfitDetailPageClient({ outfitId }: OutfitDetailPageClientProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Outfit>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Fetch data
  const { data: outfit, isLoading: outfitLoading, error: outfitError } = useOutfit(outfitId);
  
  // Mutations
  const updateOutfitMutation = useUpdateOutfit();
  const deleteOutfitMutation = useDeleteOutfit();

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

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    if (outfit) {
      setEditForm({
        name: outfit.name || '',
        tuck_style: outfit.tuck_style || 'Untucked',
        loved: outfit.loved || false,
      });
    }
  };

  const handleSave = async () => {
    if (!outfit) return;

    try {
      await updateOutfitMutation.mutateAsync({
        id: outfit.id,
        name: editForm.name?.trim() || undefined,
        tuck_style: editForm.tuck_style,
        loved: editForm.loved,
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update outfit:', error);
    }
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
    if (!outfit) return;

    try {
      // Filter out the item to be removed
      const remainingItemIds = outfit.items
        ?.filter(item => item.id !== itemId)
        .map(item => item.id) || [];

      // Update the outfit with the remaining items
      // Note: This would require an API endpoint that can update outfit items
      // For now, we'll show a placeholder implementation
      console.log('Remove item from outfit:', itemId, 'Remaining items:', remainingItemIds);
      
      // TODO: Implement actual API call to update outfit items
      // await updateOutfitItemsMutation.mutateAsync({
      //   outfitId: outfit.id,
      //   itemIds: remainingItemIds
      // });
      
    } catch (error) {
      console.error('Failed to remove item from outfit:', error);
    }
  };

  // Convert outfit items to selection format for OutfitDisplay
  const selection = React.useMemo(() => {
    if (!outfit?.items) return { tuck_style: outfit?.tuck_style || 'Untucked' };
    
    const sel: { [key: string]: any } = {
      tuck_style: outfit.tuck_style || 'Untucked'
    };
    outfit.items.forEach(item => {
      if (item.category?.name) {
        sel[item.category.name] = item;
      }
    });
    return sel;
  }, [outfit]);

  if (outfitLoading) {
    return (
      <div className="flex-1 w-full max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800 mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400">Loading outfit...</p>
          </div>
        </div>
      </div>
    );
  }

  if (outfitError || !outfit) {
    return (
      <div className="flex-1 w-full max-w-4xl mx-auto p-6">
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
    <div className="flex-1 w-full max-w-4xl mx-auto p-6">
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
                  disabled={updateOutfitMutation.isPending}
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
                      onClick={() => setEditForm(prev => ({ ...prev, tuck_style: 'Tucked' }))}
                    >
                      Tucked
                    </Button>
                    <Button
                      type="button"
                      variant={editForm.tuck_style === 'Untucked' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setEditForm(prev => ({ ...prev, tuck_style: 'Untucked' }))}
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

        {/* Items List - Flat Layout */}
        <Card>
          <CardHeader>
            <CardTitle>Items in this Outfit</CardTitle>
          </CardHeader>
          <CardContent>
            <OutfitFlatLayout
              items={outfit.items || []}
              outfitScore={outfit.score || 0}
              onRemoveItem={isEditing ? handleRemoveItem : undefined}
              isEditable={isEditing}
            />
          </CardContent>
        </Card>

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
                  Are you sure you want to delete &quot;{outfit.name || 'this outfit'}&quot;? This action cannot be undone.
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