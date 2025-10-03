import React from 'react';

export interface OutfitGenerationSkeletonProps {
  count?: number;
  className?: string;
}

export const OutfitGenerationSkeleton: React.FC<OutfitGenerationSkeletonProps> = ({ 
  count = 6,
  className = '' 
}) => {
  return (
    <div 
      className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}
      data-testid="outfit-generation-skeleton"
      role="status"
      aria-label="Loading outfit suggestions"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse">
          {/* Outfit image skeleton */}
          <div className="bg-gray-300 dark:bg-gray-600 rounded-lg h-64 mb-3 relative overflow-hidden">
            {/* Shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-shimmer"></div>
          </div>
          
          {/* Outfit title skeleton */}
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4 mb-2"></div>
          
          {/* Outfit description skeleton */}
          <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/2 mb-2"></div>
          
          {/* Score skeleton */}
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
            <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-16"></div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default OutfitGenerationSkeleton;