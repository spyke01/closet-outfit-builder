'use client';

/**
 * PinnedCard Component
 * 
 * Displays a pinned category card with size information.
 * Supports tap navigation and long-press context menu.
 * 
 * Features:
 * - Fetches category data via useSizeCategory hook
 * - Touch target minimum 44x44px for accessibility
 * - Direct lucide-react imports for bundle optimization
 * - Preload props for navigation performance
 * - Passive event listeners for touch interactions
 * 
 * Requirements: 2.1, 9.1
 */

import { useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useSizeCategory, useBrandSizes } from '@/lib/hooks/use-size-categories';
import type { DisplayMode } from '@/lib/types/sizes';
import { Clock, MoreVertical } from 'lucide-react';

/**
 * Format a date as relative time (e.g., "2 hours ago")
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  if (diffDays < 30) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths} month${diffMonths === 1 ? '' : 's'} ago`;
  
  const diffYears = Math.floor(diffDays / 365);
  return `${diffYears} year${diffYears === 1 ? '' : 's'} ago`;
}

export interface PinnedCardProps {
  categoryId: string;
  displayMode: DisplayMode;
  preferredBrandId?: string;
  onTap?: () => void;
  onLongPress?: () => void;
  preloadProps?: Record<string, unknown>; // For navigation preloading
}

/**
 * Custom hook for long-press gesture detection
 * 
 * @param onLongPress - Callback to execute after long press threshold
 * @param delay - Long press threshold in milliseconds (default: 500ms)
 * @returns Event handlers for touch interactions
 */
function useLongPress(
  onLongPress: () => void,
  delay = 500
) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef(false);

  const handleTouchStart = useCallback(() => {
    isLongPressRef.current = false;
    timeoutRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      onLongPress();
    }, delay);
  }, [onLongPress, delay]);

  const handleTouchEnd = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  const handleTouchMove = useCallback(() => {
    // Cancel long press if user moves finger
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  const wasLongPress = useCallback(() => {
    return isLongPressRef.current;
  }, []);

  return {
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd,
    onTouchMove: handleTouchMove,
    wasLongPress,
  };
}

export function PinnedCard({
  categoryId,
  displayMode,
  preferredBrandId,
  onTap,
  onLongPress,
  preloadProps = {},
}: PinnedCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  
  // Fetch category data with standard size
  const { data: categoryData, isLoading, error } = useSizeCategory(categoryId);
  
  // Fetch brand sizes for preferred-brand display mode
  const { data: brandSizes } = useBrandSizes(categoryId, {
    initialData: displayMode === 'preferred-brand' ? undefined : [],
  });
  
  // Long-press gesture handler
  const longPressHandlers = useLongPress(() => {
    if (onLongPress) {
      onLongPress();
    }
  }, 500);

  // ✅ Passive event listeners for better scroll performance
  useEffect(() => {
    const element = cardRef.current;
    if (!element) return;

    const handleTouchStartPassive = (_e: TouchEvent) => {
      longPressHandlers.onTouchStart();
    };

    const handleTouchMovePassive = (_e: TouchEvent) => {
      longPressHandlers.onTouchMove();
    };

    const handleTouchEndPassive = (_e: TouchEvent) => {
      longPressHandlers.onTouchEnd();
    };

    element.addEventListener('touchstart', handleTouchStartPassive, { passive: true });
    element.addEventListener('touchmove', handleTouchMovePassive, { passive: true });
    element.addEventListener('touchend', handleTouchEndPassive, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStartPassive);
      element.removeEventListener('touchmove', handleTouchMovePassive);
      element.removeEventListener('touchend', handleTouchEndPassive);
    };
  }, [longPressHandlers]);

  // Handle tap/click
  const handleClick = useCallback((e: React.MouseEvent) => {
    // Don't navigate if it was a long press
    if (longPressHandlers.wasLongPress()) {
      e.preventDefault();
      return;
    }
    
    if (onTap) {
      onTap();
    }
  }, [onTap, longPressHandlers]);

  // Loading state
  if (isLoading) {
    return (
      <div 
        className="pinned-card-skeleton bg-gray-100 dark:bg-gray-800 rounded-lg p-4 animate-pulse w-[85vw] md:w-auto"
        style={{ minHeight: '120px' }}
        aria-busy="true"
        aria-label="Loading category information"
      >
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-3"></div>
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
      </div>
    );
  }

  // Error state
  if (error || !categoryData) {
    return (
      <div 
        className="pinned-card-error bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 w-[85vw] md:w-auto"
        style={{ minHeight: '120px' }}
        role="alert"
      >
        <p className="text-red-800 dark:text-red-200 font-medium">
          Failed to load category
        </p>
        <p className="text-red-600 dark:text-red-400 text-sm mt-1">
          {error?.message || 'Category not found'}
        </p>
      </div>
    );
  }

  const category = categoryData;
  const standardSize = Array.isArray(categoryData.standard_sizes) 
    ? categoryData.standard_sizes[0] 
    : undefined;

  // Format last updated timestamp
  const lastUpdated = standardSize?.updated_at 
    ? formatRelativeTime(standardSize.updated_at)
    : 'Never';

  // Determine what size to display based on display mode
  const getSizeDisplay = () => {
    if (!standardSize) {
      return <span className="text-gray-400 dark:text-gray-500 text-sm">No size set</span>;
    }

    switch (displayMode) {
      case 'standard':
        // Show primary size only
        // Requirements: 15.2
        return (
          <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {standardSize.primary_size}
          </span>
        );
      
      case 'dual':
        // Show primary and secondary sizes
        // Requirements: 15.3
        return (
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {standardSize.primary_size}
            </span>
            {standardSize.secondary_size && (
              <>
                <span className="text-gray-400 dark:text-gray-500">/</span>
                <span className="text-xl font-semibold text-gray-700 dark:text-gray-300">
                  {standardSize.secondary_size}
                </span>
              </>
            )}
          </div>
        );
      
      case 'preferred-brand':
        // Show preferred brand size
        // Requirements: 15.4
        if (preferredBrandId && brandSizes) {
          const preferredBrand = brandSizes.find(bs => bs.id === preferredBrandId);
          if (preferredBrand) {
            return (
              <div className="space-y-1">
                <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {preferredBrand.size}
                </span>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {preferredBrand.brand_name}
                  {preferredBrand.item_type && ` - ${preferredBrand.item_type}`}
                </div>
              </div>
            );
          }
        }
        // Fall back to standard size if preferred brand not found
        return (
          <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {standardSize.primary_size}
          </span>
        );
      
      default:
        return (
          <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {standardSize.primary_size}
          </span>
        );
    }
  };

  return (
    <Link
      href={`/sizes/${categoryId}`}
      onClick={handleClick}
      {...preloadProps}
      className="pinned-card-link block"
    >
      <div
        ref={cardRef}
        className="pinned-card bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer w-[85vw] md:w-auto"
        style={{
          minHeight: '120px', // ✅ Ensures 44x44px minimum touch target
        }}
        role="button"
        tabIndex={0}
        aria-label={`View ${category.name} size details`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick(e as unknown as React.MouseEvent);
          }
        }}
      >
        {/* Header with category name and menu button */}
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {category.name}
          </h3>
          
          {onLongPress && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onLongPress();
              }}
              className="icon-button p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
              style={{ minWidth: '44px', minHeight: '44px' }} // ✅ 44x44px touch target
              aria-label={`Options for ${category.name}`}
              type="button"
            >
              <MoreVertical 
                className="h-5 w-5 text-gray-500 dark:text-gray-400" 
                aria-hidden="true"
              />
            </button>
          )}
        </div>

        {/* Size display */}
        <div className="mb-3">
          {getSizeDisplay()}
        </div>

        {/* Last updated timestamp */}
        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
          <Clock className="h-3 w-3" aria-hidden="true" />
          <span>Updated {lastUpdated}</span>
        </div>
      </div>
    </Link>
  );
}
