import React, { useState, useCallback } from 'react';
import { WardrobeItem, Category } from '../types';

// Layer z-index mapping for proper stacking
const getLayerZIndex = (category: Category): number => {
  switch (category) {
    case 'Jacket/Overshirt': return 50; // Top layer
    case 'Shirt': return 40;
    case 'Undershirt': return 30;
    case 'Pants': return 20;
    case 'Shoes': return 10;
    case 'Belt': return 25; // Above pants, below shirts
    case 'Watch': return 60; // Accessory, always visible
    default: return 0;
  }
};

interface ClothingItemDisplayProps {
  item: WardrobeItem;
  className?: string;
  style?: React.CSSProperties;
}

export const ClothingItemDisplay: React.FC<ClothingItemDisplayProps> = ({
  item,
  className = '',
  style = {}
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const zIndex = getLayerZIndex(item.category);
  const hasValidImage = item.image && item.image.trim() !== '';

  const handleImageLoad = useCallback(() => {
    setImageLoading(false);
  }, []);

  const handleImageError = useCallback(() => {
    setImageError(true);
    setImageLoading(false);
  }, []);

  // Create wrapper style with z-index for proper layering
  const wrapperStyle: React.CSSProperties = {
    zIndex,
    position: 'relative',
    ...style
  };

  // Only render if we have a valid image and no error
  if (!hasValidImage || imageError) {
    return null;
  }

  return (
    <div style={wrapperStyle} className={`clothing-item-wrapper ${className}`}>
      {imageLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded animate-pulse">
          <div className="text-gray-400 text-xs">Loading...</div>
        </div>
      )}
      <img
        src={item.image}
        alt={item.name}
        className={`w-full h-full object-contain ${imageLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-200`}
        onLoad={handleImageLoad}
        onError={handleImageError}
        style={{
          filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))',
          maxWidth: '100%',
          maxHeight: '100%'
        }}
      />
    </div>
  );
};

// Re-export utility function for backward compatibility
export { getLayerZIndex };
