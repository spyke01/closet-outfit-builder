import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Lock } from 'lucide-react';
import { Category, WardrobeItem } from '../types';

interface CategoryDropdownProps {
  category: Category;
  selectedItem: WardrobeItem | null;
  availableItems: WardrobeItem[];
  onSelect: (item: WardrobeItem | null) => void;
  disabled?: boolean;
  isLoading?: boolean;
  isLocked?: boolean;
}

export const CategoryDropdown: React.FC<CategoryDropdownProps> = ({
  category,
  selectedItem,
  availableItems,
  onSelect,
  disabled = false,
  isLoading = false,
  isLocked = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Get color indicator for an item
  const getColorIndicator = (item: WardrobeItem): string => {
    if (!item.name) return '#94a3b8'; // Default gray
    
    const name = item.name.toLowerCase();
    
    // Extract color from item name
    if (name.includes('white')) return '#ffffff';
    if (name.includes('black')) return '#000000';
    if (name.includes('navy') || name.includes('deep navy')) return '#1e3a8a';
    if (name.includes('blue')) return '#3b82f6';
    if (name.includes('grey') || name.includes('gray')) return '#6b7280';
    if (name.includes('charcoal')) return '#374151';
    if (name.includes('khaki')) return '#a3a380';
    if (name.includes('olive')) return '#84cc16';
    if (name.includes('brown') || name.includes('tan')) return '#92400e';
    if (name.includes('cream')) return '#fef3c7';
    if (name.includes('beige')) return '#f5f5dc';
    if (name.includes('camel')) return '#c19a6b';
    if (name.includes('striped')) return '#e5e7eb'; // Light gray for striped
    
    // Default color based on category
    return '#94a3b8';
  };

  const handleItemSelect = (item: WardrobeItem | null) => {
    onSelect(item);
    setIsOpen(false);
  };

  const handleToggleOpen = () => {
    if (!disabled && !isLoading) {
      if (!isOpen && buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        setDropdownPosition({
          top: rect.bottom + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width
        });
      }
      setIsOpen(!isOpen);
    }
  };



  return (
    <div className="relative w-full md:flex-shrink-0" ref={dropdownRef}>
      <button
        ref={buttonRef}
        onClick={handleToggleOpen}
        disabled={disabled || isLoading}
        className={`
          flex items-center justify-between w-full md:min-w-[140px] 
          min-h-[44px] px-3 py-2 
          bg-white border border-stone-300 rounded-lg text-left
          transition-colors duration-200 touch-manipulation
          ${disabled || isLoading
            ? 'opacity-50 cursor-not-allowed bg-stone-50' 
            : 'hover:border-stone-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 active:bg-stone-50'
          }
        `}
      >
        <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
          {isLoading ? (
            <>
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-stone-200 animate-pulse flex-shrink-0" />
              <span className="text-xs sm:text-sm text-slate-500">Loading...</span>
            </>
          ) : selectedItem ? (
            <>
              <div 
                className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border border-stone-300 flex-shrink-0 transition-all duration-200 hover:scale-110"
                style={{ backgroundColor: getColorIndicator(selectedItem) }}
              />
              <span className={`text-xs sm:text-sm font-medium truncate ${isLocked ? 'text-slate-600' : 'text-slate-800'}`}>
                {selectedItem.name}
                {isLocked && <span className="ml-1 text-xs text-slate-500 hidden sm:inline">(Anchor)</span>}
              </span>
            </>
          ) : (
            <span className="text-xs sm:text-sm text-slate-500">
              {availableItems.length === 0 
                ? 'No items' 
                : 'Select'
              }
            </span>
          )}
        </div>
        {isLocked ? (
          <Lock 
            size={12} 
            className="text-slate-400 flex-shrink-0 ml-1 sm:size-[14px]" 
          />
        ) : (
          <ChevronDown 
            size={14} 
            className={`text-slate-400 transition-transform duration-200 flex-shrink-0 ml-1 sm:size-4 ${
              isOpen ? 'rotate-180' : ''
            }`} 
          />
        )}
      </button>

      {isOpen && !isLoading && (
        <div 
          className="fixed bg-white border border-stone-300 rounded-lg shadow-lg z-[9999] max-h-60 overflow-y-auto animate-in fade-in-0 zoom-in-95 duration-200"
          style={{
            top: `${dropdownPosition.top + 4}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`,
            minWidth: '140px'
          }}
        >
          {/* Clear selection option - only show if there's a selected item AND available items */}
          {selectedItem && availableItems.length > 0 && (
            <button
              onClick={() => handleItemSelect(null)}
              className="w-full px-2 sm:px-3 py-3 sm:py-2 text-left text-xs sm:text-sm text-slate-500 hover:bg-stone-50 border-b border-stone-100 transition-colors duration-150 min-h-[44px] sm:min-h-0 flex items-center touch-manipulation"
            >
              Select One
            </button>
          )}
          
          {/* Available items */}
          {availableItems.length === 0 ? (
            <div className="px-2 sm:px-3 py-3 sm:py-2 text-xs sm:text-sm text-slate-500 italic min-h-[44px] sm:min-h-0 flex items-center">
              No compatible items
            </div>
          ) : (
            availableItems.map((item, index) => (
              <button
                key={item.id}
                onClick={() => handleItemSelect(item)}
                className={`
                  w-full px-2 sm:px-3 py-3 sm:py-2 text-left text-xs sm:text-sm hover:bg-stone-50 
                  flex items-center gap-1.5 sm:gap-2 transition-all duration-150
                  hover:translate-x-1 hover:shadow-sm min-h-[44px] sm:min-h-0 touch-manipulation
                  ${selectedItem?.id === item.id ? 'bg-blue-50 text-blue-800 border-l-2 border-blue-400' : 'text-slate-800'}
                `}
                style={{
                  animationDelay: `${index * 20}ms`,
                  animation: 'slideInFromLeft 0.3s ease-out forwards'
                }}
              >
                <div 
                  className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border border-stone-300 flex-shrink-0 transition-transform duration-150 hover:scale-110"
                  style={{ backgroundColor: getColorIndicator(item) }}
                />
                <span className="truncate">{item.name}</span>
              </button>
            ))
          )}
        </div>
      )}


    </div>
  );
};