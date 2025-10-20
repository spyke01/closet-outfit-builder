'use client';

import React, { useMemo } from 'react';
import { Shirt, X, Eye, Star } from 'lucide-react';
import Link from 'next/link';
import { WardrobeItem } from '@/lib/types/database';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

interface OutfitFlatLayoutProps {
  items: WardrobeItem[];
  outfitScore?: number;
  onRemoveItem?: (itemId: string) => void;
  isEditable?: boolean;
  className?: string;
}

interface ItemWithScore extends WardrobeItem {
  scoreContribution: number;
  scorePercentage: number;
}

export function OutfitFlatLayout({ 
  items, 
  outfitScore = 0, 
  onRemoveItem, 
  isEditable = false,
  className = '' 
}: OutfitFlatLayoutProps) {
  // Calculate individual item score contributions
  const itemsWithScores = useMemo((): ItemWithScore[] => {
    if (!items.length) return [];

    // Base score calculation logic
    const baseScorePerItem = Math.floor(outfitScore / items.length);
    const remainder = outfitScore % items.length;

    return items.map((item, index) => {
      // Distribute remainder among first few items
      const scoreContribution = baseScorePerItem + (index < remainder ? 1 : 0);
      const scorePercentage = outfitScore > 0 ? Math.round((scoreContribution / outfitScore) * 100) : 0;

      return {
        ...item,
        scoreContribution,
        scorePercentage
      };
    });
  }, [items, outfitScore]);

  const handleRemoveItem = (itemId: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    onRemoveItem?.(itemId);
  };

  const handleViewDetails = (itemId: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    // Navigation will be handled by the Link component
  };

  if (!items.length) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="text-center">
          <Shirt size={48} className="text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 dark:text-slate-400">
            No items in this outfit
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header with total score */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Outfit Items ({items.length})
        </h3>
        {outfitScore > 0 && (
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-yellow-500" />
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Total Score: {outfitScore}/100
            </span>
          </div>
        )}
      </div>

      {/* Responsive grid of items */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {itemsWithScores.map((item) => (
          <Card key={item.id} className="group relative overflow-hidden hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              {/* Item image */}
              <div className="relative mb-3">
                <div className="aspect-square rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-700">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Shirt className="h-8 w-8 text-slate-400" />
                    </div>
                  )}
                </div>

                {/* Action buttons overlay */}
                {isEditable && (
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex gap-1">
                      <Link href={`/wardrobe/items/${item.id}`}>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-8 w-8 p-0 bg-white/90 hover:bg-white shadow-sm"
                          onClick={(e) => handleViewDetails(item.id, e)}
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                      </Link>
                      {onRemoveItem && (
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-8 w-8 p-0 bg-red-500/90 hover:bg-red-600 shadow-sm"
                          onClick={(e) => handleRemoveItem(item.id, e)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* Score contribution badge */}
                {outfitScore > 0 && (
                  <div className="absolute bottom-2 left-2">
                    <Badge variant="secondary" className="text-xs bg-white/90 text-slate-700">
                      {item.scoreContribution} pts
                    </Badge>
                  </div>
                )}
              </div>

              {/* Item details */}
              <div className="space-y-2">
                {/* Category label */}
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs">
                    {item.category?.name || 'Unknown'}
                  </Badge>
                  {outfitScore > 0 && (
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {item.scorePercentage}%
                    </span>
                  )}
                </div>

                {/* Item name */}
                <h4 className="font-medium text-slate-900 dark:text-slate-100 text-sm leading-tight truncate">
                  {item.name}
                </h4>

                {/* Item metadata */}
                <div className="space-y-1">
                  {item.brand && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {item.brand}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    {item.color && (
                      <span className="truncate">{item.color}</span>
                    )}
                    {item.formality_score && (
                      <span className="flex items-center gap-1">
                        <Star className="h-3 w-3" />
                        {item.formality_score}/10
                      </span>
                    )}
                  </div>
                </div>

                {/* Interactive link overlay for non-editable mode */}
                {!isEditable && (
                  <Link 
                    href={`/wardrobe/items/${item.id}`}
                    className="absolute inset-0 z-10"
                  >
                    <span className="sr-only">View {item.name} details</span>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary footer */}
      {outfitScore > 0 && (
        <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-400">
              Score Distribution
            </span>
            <div className="flex items-center gap-4">
              <span className="text-slate-600 dark:text-slate-400">
                Avg per item: {Math.round(outfitScore / items.length)}
              </span>
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 text-yellow-500" />
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  {outfitScore}/100
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}