'use client';

/**
 * CustomizePinnedCardsView Component
 * 
 * Interface for managing pinned cards: pin/unpin categories, reorder, and set display modes.
 * 
 * Features:
 * - List all categories with pin/unpin toggles
 * - Drag handles for reordering pinned cards
 * - Display mode dropdown per pinned card
 * - Responsive presentation (mobile: full-screen, tablet+: side drawer)
 * - Functional setState for stable callbacks
 * 
 * Requirements: 8.4, 8.2, 8.3
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useSizeCategories, usePinnedPreferences, useUpdatePinnedPreferences } from '@/lib/hooks/use-size-categories';
import type { DisplayMode } from '@/lib/types/sizes';
import { X, GripVertical, Check } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export interface CustomizePinnedCardsViewProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * CustomizePinnedCardsView Component
 * 
 * Allows users to customize which categories are pinned, their order, and display modes.
 * 
 * @param isOpen - Whether the view is currently open
 * @param onClose - Callback to close the view
 */
export function CustomizePinnedCardsView({
  isOpen,
  onClose,
}: CustomizePinnedCardsViewProps) {
  const { data: categories = [] } = useSizeCategories();
  const { data: pinnedPreferences = [] } = usePinnedPreferences();
  const updatePinnedPreferences = useUpdatePinnedPreferences();

  // Drag and drop state
  const draggedIndexRef = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Local state for managing pinned cards before saving
  // ✅ Using functional setState for stable callbacks
  const [localPinnedIds, setLocalPinnedIds] = useState<string[]>(() => 
    pinnedPreferences
      .sort((a, b) => a.display_order - b.display_order)
      .map(p => p.category_id)
  );

  const [displayModes, setDisplayModes] = useState<Record<string, DisplayMode>>(() => {
    const modes: Record<string, DisplayMode> = {};
    pinnedPreferences.forEach(p => {
      modes[p.category_id] = p.display_mode;
    });
    return modes;
  });

  const [preferredBrands, setPreferredBrands] = useState<Record<string, string | undefined>>(() => {
    const brands: Record<string, string | undefined> = {};
    pinnedPreferences.forEach(p => {
      if (p.preferred_brand_id) {
        brands[p.category_id] = p.preferred_brand_id;
      }
    });
    return brands;
  });

  // Sync local state when pinned preferences change
  useEffect(() => {
    const sortedPinned = [...pinnedPreferences].sort((a, b) => a.display_order - b.display_order);
    setLocalPinnedIds(sortedPinned.map(p => p.category_id));
    
    const modes: Record<string, DisplayMode> = {};
    const brands: Record<string, string | undefined> = {};
    pinnedPreferences.forEach(p => {
      modes[p.category_id] = p.display_mode;
      if (p.preferred_brand_id) {
        brands[p.category_id] = p.preferred_brand_id;
      }
    });
    setDisplayModes(modes);
    setPreferredBrands(brands);
  }, [pinnedPreferences]);

  // ✅ Functional setState for stable callbacks
  const handleTogglePin = useCallback((categoryId: string) => {
    setLocalPinnedIds(curr => {
      if (curr.includes(categoryId)) {
        // Unpin
        return curr.filter(id => id !== categoryId);
      } else {
        // Pin - add to end
        return [...curr, categoryId];
      }
    });
  }, []);

  // ✅ Functional setState for stable callbacks
  const handleDisplayModeChange = useCallback((categoryId: string, mode: DisplayMode) => {
    setDisplayModes(curr => ({
      ...curr,
      [categoryId]: mode,
    }));
  }, []);

  // ✅ Native HTML5 drag-and-drop implementation
  // Requirements: 8.4, 8.5
  const handleDragStart = useCallback((index: number) => {
    draggedIndexRef.current = index;
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault(); // Allow drop
    setDragOverIndex(index);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    const dragIndex = draggedIndexRef.current;
    if (dragIndex === null || dragIndex === dropIndex) {
      setDragOverIndex(null);
      return;
    }

    // ✅ Functional setState for stable callbacks
    setLocalPinnedIds(curr => {
      const newOrder = [...curr];
      const [draggedItem] = newOrder.splice(dragIndex, 1);
      newOrder.splice(dropIndex, 0, draggedItem);
      return newOrder;
    });

    draggedIndexRef.current = null;
    setDragOverIndex(null);
  }, []);

  const handleDragEnd = useCallback(() => {
    draggedIndexRef.current = null;
    setDragOverIndex(null);
  }, []);

  // Keyboard navigation for drag-and-drop
  // Requirements: 8.4, 8.5
  const handleKeyDown = useCallback((e: React.KeyboardEvent, index: number) => {
    if (e.key === 'ArrowUp' && index > 0) {
      e.preventDefault();
      // Move up
      setLocalPinnedIds(curr => {
        const newOrder = [...curr];
        [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
        return newOrder;
      });
    } else if (e.key === 'ArrowDown' && index < localPinnedIds.length - 1) {
      e.preventDefault();
      // Move down
      setLocalPinnedIds(curr => {
        const newOrder = [...curr];
        [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
        return newOrder;
      });
    }
  }, [localPinnedIds.length]);

  // Save changes to database
  const handleSave = useCallback(async () => {
    try {
      // Build pinned preferences array with display_order
      const preferences = localPinnedIds.map((categoryId, index) => ({
        category_id: categoryId,
        display_order: index,
        display_mode: displayModes[categoryId] || 'standard' as DisplayMode,
        preferred_brand_id: preferredBrands[categoryId],
      }));

      await updatePinnedPreferences.mutateAsync(preferences);
      onClose();
    } catch (error) {
      console.error('Failed to update pinned preferences:', error);
      // TODO: Show error toast/notification
    }
  }, [localPinnedIds, displayModes, preferredBrands, updatePinnedPreferences, onClose]);

  // Cancel and close without saving
  const handleCancel = useCallback(() => {
    // Reset local state to match current pinned preferences
    const sortedPinned = [...pinnedPreferences].sort((a, b) => a.display_order - b.display_order);
    setLocalPinnedIds(sortedPinned.map(p => p.category_id));
    
    const modes: Record<string, DisplayMode> = {};
    const brands: Record<string, string | undefined> = {};
    pinnedPreferences.forEach(p => {
      modes[p.category_id] = p.display_mode;
      if (p.preferred_brand_id) {
        brands[p.category_id] = p.preferred_brand_id;
      }
    });
    setDisplayModes(modes);
    setPreferredBrands(brands);
    
    onClose();
  }, [pinnedPreferences, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={handleCancel}
        aria-hidden="true"
      />

      {/* Drawer/Modal */}
      {/* Mobile: full-screen view */}
      {/* Tablet+: side drawer */}
      {/* Requirements: 8.2, 8.3 */}
      <div
        className="fixed inset-0 md:inset-y-0 md:right-0 md:left-auto md:w-96 bg-background z-50 flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="customize-pinned-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2
            id="customize-pinned-title"
            className="text-xl font-bold text-foreground"
          >
            Customize Pinned Cards
          </h2>
          
          <button
            onClick={handleCancel}
            className="icon-button p-2 hover:bg-muted rounded-md transition-colors"
            style={{ minWidth: '44px', minHeight: '44px' }} // ✅ 44x44px touch target
            aria-label="Close customize view"
            type="button"
          >
            <X className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Pinned categories section */}
          {localPinnedIds.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Pinned Categories
              </h3>
              
              <div className="space-y-2">
                {localPinnedIds.map((categoryId, index) => {
                  const category = categories.find(c => c.id === categoryId);
                  if (!category) return null;

                  const isDraggedOver = dragOverIndex === index;

                  return (
                    <div
                      key={categoryId}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, index)}
                      onDragEnd={handleDragEnd}
                      role="button"
                      tabIndex={0}
                      className={`bg-muted border rounded-lg p-3 transition-all ${
                        isDraggedOver
                          ? 'border-ring border-2 bg-secondary/10'
                          : 'border-border'
                      }`}
                    >
                      {/* Category header with drag handle and toggle */}
                      <div className="flex items-center gap-3 mb-3">
                        {/* Drag handle with keyboard support */}
                        <div
                          className="drag-handle cursor-move text-muted-foreground hover:text-foreground transition-colors"
                          role="button"
                          tabIndex={0}
                          aria-label={`Reorder ${category.name}. Use arrow keys to move up or down.`}
                          onKeyDown={(e) => handleKeyDown(e, index)}
                          style={{ minWidth: '44px', minHeight: '44px' }} // ✅ 44x44px touch target
                        >
                          <GripVertical className="h-5 w-5" aria-hidden="true" />
                        </div>

                        {/* Category name */}
                        <span className="flex-1 font-medium text-foreground">
                          {category.name}
                        </span>

                        {/* Pin toggle */}
                        <div className="flex items-center gap-2">
                          <Switch
                            id={`pin-${categoryId}`}
                            checked={true}
                            onCheckedChange={() => handleTogglePin(categoryId)}
                            aria-label={`Unpin ${category.name}`}
                          />
                        </div>
                      </div>

                      {/* Display mode selector */}
                      <div className="space-y-2">
                        <Label
                          htmlFor={`display-mode-${categoryId}`}
                          className="text-sm text-muted-foreground"
                        >
                          Display Mode
                        </Label>
                        
                        <select
                          id={`display-mode-${categoryId}`}
                          value={displayModes[categoryId] || 'standard'}
                          onChange={(e) => handleDisplayModeChange(categoryId, e.target.value as DisplayMode)}
                          className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                          style={{ minHeight: '44px' }} // ✅ 44x44px touch target
                        >
                          <option value="standard">Standard Size</option>
                          <option value="dual">Dual Size</option>
                          <option value="preferred-brand">Preferred Brand</option>
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Unpinned categories section */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {localPinnedIds.length > 0 ? 'Other Categories' : 'All Categories'}
            </h3>
            
            <div className="space-y-2">
              {categories
                .filter(category => !localPinnedIds.includes(category.id))
                .map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center justify-between p-3 bg-muted border border-border rounded-lg"
                  >
                    <span className="font-medium text-foreground">
                      {category.name}
                    </span>

                    <div className="flex items-center gap-2">
                      <Label
                        htmlFor={`pin-${category.id}`}
                        className="text-sm text-muted-foreground"
                      >
                        Pin
                      </Label>
                      <Switch
                        id={`pin-${category.id}`}
                        checked={false}
                        onCheckedChange={() => handleTogglePin(category.id)}
                        aria-label={`Pin ${category.name}`}
                      />
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Empty state */}
          {categories.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>No categories available.</p>
              <p className="text-sm mt-2">Create a category first to pin it.</p>
            </div>
          )}
        </div>

        {/* Footer with action buttons */}
        <div className="flex gap-3 p-4 border-t border-border">
          <button
            onClick={handleCancel}
            className="flex-1 px-4 py-2 bg-card border border-border hover:bg-muted text-foreground font-medium rounded-lg transition-colors"
            style={{ minHeight: '44px' }} // ✅ 44x44px touch target
            type="button"
          >
            Cancel
          </button>
          
          <button
            onClick={handleSave}
            disabled={updatePinnedPreferences.isPending}
            className="flex-1 px-4 py-2 bg-primary hover:opacity-90 disabled:opacity-50 text-primary-foreground font-medium rounded-lg transition-colors inline-flex items-center justify-center gap-2"
            style={{ minHeight: '44px' }} // ✅ 44x44px touch target
            type="button"
          >
            {updatePinnedPreferences.isPending ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                Saving...
              </>
            ) : (
              <>
                <Check className="h-5 w-5" aria-hidden="true" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
