'use client';

import { GeneratedOutfit } from '@/lib/types/generation';
import Image from 'next/image';
import { RefreshCw } from 'lucide-react';

interface TodayOutfitDisplayProps {
  outfit: GeneratedOutfit;
  onSwap: (category: string) => void;
  generating: boolean;
}

export default function TodayOutfitDisplay({ outfit, onSwap, generating }: TodayOutfitDisplayProps) {
  const categories = ['jacket', 'overshirt', 'shirt', 'undershirt', 'pants', 'shoes', 'belt', 'watch'] as const;
  
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {categories.map(category => {
        const item = outfit.items[category];
        if (!item) return null;
        
        const hasAlternatives = outfit.swappable[category];
        
        return (
          <div key={category} className="border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
            {/* Image with floating swap button */}
            <div className="relative w-full h-48 bg-gray-50 dark:bg-slate-700">
              {item.image_url && (
                <Image
                  src={item.image_url}
                  alt={item.name}
                  fill
                  className="object-contain p-4"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                />
              )}
              
              {/* Floating swap button */}
              {hasAlternatives && (
                <button
                  onClick={() => onSwap(category)}
                  disabled={generating}
                  className="absolute top-2 right-2 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-slate-700 dark:text-slate-300"
                  aria-label={`Swap ${category}`}
                >
                  <RefreshCw className="w-3 h-3" aria-hidden="true" />
                  Swap
                </button>
              )}
            </div>
            
            {/* Item info */}
            <div className="p-3 border-t border-gray-200 dark:border-slate-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{category}</p>
              <p className="text-sm font-medium text-slate-900 dark:text-white line-clamp-2">{item.name}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
