'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Lock, Loader2 } from 'lucide-react';
import { useComponentPreloading } from '@/lib/hooks/use-intelligent-preloading';




import { safeValidate } from '@/lib/utils/validation';
import { WardrobeItemSchema, type WardrobeItem } from '@/lib/schemas';

interface CategoryDropdownProps {
  category: string;
  selectedItem: WardrobeItem | null;
  availableItems: WardrobeItem[];
  onSelect: (item: WardrobeItem | null) => void;
  isLoading?: boolean;
  disabled?: boolean;
  isLocked?: boolean;
}

export const CategoryDropdown: React.FC<CategoryDropdownProps> = ({
  category,
  selectedItem,
  availableItems,
  onSelect,
  isLoading = false,
  disabled = false,
  isLocked = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Preload image upload component when dropdown is interacted with
  const { preloadProps } = useComponentPreloading(
    'imageProcessing',
    () => import('./image-upload')
  );

  // Validate items with Zod
  const validatedItems = React.useMemo(() => {
    return availableItems.filter(item => {
      const validation = safeValidate(WardrobeItemSchema, item);
      if (!validation.success) {
        console.warn(`Invalid item in ${category}:`, validation.error);
        return false;
      }
      return true;
    });
  }, [availableItems, category]);

  const validatedSelectedItem = React.useMemo(() => {
    if (!selectedItem) return null;
    
    const validation = safeValidate(WardrobeItemSchema, selectedItem);
    if (!validation.success) {
      console.warn('Invalid selected item:', validation.error);
      return null;
    }
    
    return validation.data;
  }, [selectedItem]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (item: WardrobeItem | null) => {
    onSelect(item);
    setIsOpen(false);
  };

  const formatItemName = (item: WardrobeItem): string => {
    if (item.brand) {
      return `${item.brand} ${item.name}`;
    }
    return item.name;
  };

  const buttonContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center gap-2">
          <Loader2 size={16} className="animate-spin" />
          <span>Loading...</span>
        </div>
      );
    }

    if (isLocked && validatedSelectedItem) {
      return (
        <div className="flex items-center gap-2">
          <Lock size={16} className="text-slate-500" />
          <span className="truncate">{formatItemName(validatedSelectedItem)}</span>
        </div>
      );
    }

    if (validatedSelectedItem) {
      return (
        <span className="truncate">{formatItemName(validatedSelectedItem)}</span>
      );
    }

    return (
      <span className="text-slate-500 dark:text-slate-400">
        Select {category}
      </span>
    );
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => !disabled && !isLocked && setIsOpen(!isOpen)}
        disabled={disabled || isLoading}
        className={`
          w-full px-3 py-2 text-left border rounded-lg transition-colors min-h-[44px] flex items-center justify-between gap-2
          ${disabled || isLocked 
            ? 'bg-gray-100 dark:bg-slate-700 border-gray-200 dark:border-slate-600 cursor-not-allowed' 
            : 'bg-white dark:bg-slate-800 border-stone-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500'
          }
          ${isOpen ? 'ring-2 ring-slate-500 border-slate-500' : ''}
        `}
        aria-label={`Select ${category}`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        {...preloadProps}
      >
        <div className="flex-1 min-w-0">
          {buttonContent()}
        </div>
        
        {!isLocked && !isLoading && (
          <ChevronDown 
            size={16} 
            className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          />
        )}
      </button>

      {isOpen && !disabled && !isLocked && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-stone-300 dark:border-slate-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {/* Clear selection option */}
          <button
            onClick={() => handleSelect(null)}
            className="w-full px-3 py-2 text-left hover:bg-stone-50 dark:hover:bg-slate-700 transition-colors text-slate-500 dark:text-slate-400 italic"
          >
            Clear selection
          </button>
          
          {validatedItems.length === 0 ? (
            <div className="px-3 py-2 text-slate-500 dark:text-slate-400 text-sm">
              No items available
            </div>
          ) : (
            validatedItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleSelect(item)}
                className={`
                  w-full px-3 py-2 text-left hover:bg-stone-50 dark:hover:bg-slate-700 transition-colors
                  ${validatedSelectedItem?.id === item.id ? 'bg-slate-100 dark:bg-slate-700' : ''}
                `}
              >
                <div className="flex items-center gap-2">
                  {item.color && (
                    <div 
                      className="w-3 h-3 rounded-full border border-stone-300 dark:border-slate-600 flex-shrink-0"
                      style={{ backgroundColor: item.color.toLowerCase() }}
                    />
                  )}
                  <span className="truncate">{formatItemName(item)}</span>
                </div>
                {item.capsule_tags && item.capsule_tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {item.capsule_tags.slice(0, 2).map(tag => (
                      <span 
                        key={tag}
                        className="px-1 py-0.5 text-xs bg-stone-100 dark:bg-slate-600 text-stone-600 dark:text-slate-300 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};