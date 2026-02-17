'use client';

import { createLogger } from '@/lib/utils/logger';

const logger = createLogger({ component: 'components-category-dropdown' });
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
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

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
        logger.warn(`Invalid item in ${category}:`, validation.error);
        return false;
      }
      return true;
    });
  }, [availableItems, category]);

  const validatedSelectedItem = React.useMemo(() => {
    if (!selectedItem) return null;
    
    const validation = safeValidate(WardrobeItemSchema, selectedItem);
    if (!validation.success) {
      logger.warn('Invalid selected item:', validation.error);
      return null;
    }
    
    return validation.data;
  }, [selectedItem]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset focused index when dropdown opens/closes
  useEffect(() => {
    if (!isOpen) {
      setFocusedIndex(-1);
    }
  }, [isOpen]);

  // Focus management for keyboard navigation
  useEffect(() => {
    if (isOpen && focusedIndex >= 0 && itemRefs.current[focusedIndex]) {
      itemRefs.current[focusedIndex]?.focus();
    }
  }, [focusedIndex, isOpen]);

  const handleSelect = (item: WardrobeItem | null) => {
    onSelect(item);
    setIsOpen(false);
    setFocusedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled || isLocked) return;

    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        }
        break;
      case 'Escape':
        if (isOpen) {
          e.preventDefault();
          setIsOpen(false);
          setFocusedIndex(-1);
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setFocusedIndex(prev => 
            prev < validatedItems.length ? prev + 1 : prev
          );
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (isOpen) {
          setFocusedIndex(prev => prev > -1 ? prev - 1 : -1);
        }
        break;
    }
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
          <Lock size={16} className="text-muted-foreground" />
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
      <span className="text-muted-foreground">
        Select {category}
      </span>
    );
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => !disabled && !isLocked && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        disabled={disabled || isLoading}
        className={`
          w-full px-3 py-2 text-left border rounded-lg transition-colors min-h-[44px] flex items-center justify-between gap-2
          ${disabled || isLocked 
            ? 'bg-muted border-border cursor-not-allowed' 
            : 'bg-card border-border hover:border-border'
          }
          ${isOpen ? 'ring-2 ring-ring border-border' : ''}
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
            className={`text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          />
        )}
      </button>

      {isOpen && !disabled && !isLocked && (
        <div 
          className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto"
          role="listbox"
          aria-label={`${category} options`}
        >
          {/* Clear selection option */}
          <button
            ref={el => { itemRefs.current[-1] = el; }}
            onClick={() => handleSelect(null)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleSelect(null);
              }
            }}
            className="w-full px-3 py-2 text-left hover:bg-muted transition-colors text-muted-foreground italic focus:bg-muted focus:outline-none"
            role="option"
            aria-selected={!validatedSelectedItem}
          >
            Clear selection
          </button>
          
          {validatedItems.length === 0 ? (
            <div className="px-3 py-2 text-muted-foreground text-sm">
              No items available
            </div>
          ) : (
            validatedItems.map((item, index) => (
              <button
                key={item.id}
                ref={el => { itemRefs.current[index] = el; }}
                onClick={() => handleSelect(item)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSelect(item);
                  }
                }}
                className={`
                  w-full px-3 py-2 text-left hover:bg-muted transition-colors focus:bg-muted focus:outline-none
                  ${validatedSelectedItem?.id === item.id ? 'bg-muted' : ''}
                `}
                role="option"
                aria-selected={validatedSelectedItem?.id === item.id}
              >
                <div className="flex items-center gap-2">
                  {item.color && (
                    <div 
                      className="w-3 h-3 rounded-full border border-border flex-shrink-0"
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
                        className="px-1 py-0.5 text-xs bg-muted text-muted-foreground rounded"
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