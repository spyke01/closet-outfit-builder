import React, { useState } from 'react';
import { Search, Tag } from 'lucide-react';
import { WardrobeItem, Category, CapsuleTag } from '../types';
import { ColorCircle } from './ColorCircle';
import { useSettings } from '../contexts/SettingsContext';
import { formatItemName } from '../utils/itemUtils';

interface ItemsGridProps {
  category: Category;
  items: WardrobeItem[];
  selectedItem?: WardrobeItem;
  onItemSelect: (item: WardrobeItem) => void;
}

const capsuleTags: CapsuleTag[] = ['Refined', 'Adventurer', 'Crossover', 'Shorts'];

export const ItemsGrid: React.FC<ItemsGridProps> = ({
  category,
  items,
  selectedItem,
  onItemSelect
}) => {
  const { settings } = useSettings();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState<Set<CapsuleTag>>(new Set());

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTags = selectedTags.size === 0 ||
      item.capsuleTags?.some(tag => selectedTags.has(tag));
    return matchesSearch && matchesTags;
  });

  const toggleTag = (tag: CapsuleTag) => {
    const newTags = new Set(selectedTags);
    if (newTags.has(tag)) {
      newTags.delete(tag);
    } else {
      newTags.add(tag);
    }
    setSelectedTags(newTags);
  };

  return (
    <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        <div className="mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-light text-slate-800 dark:text-slate-200 mb-4">
            Choose {category}
          </h2>

          {/* Mobile-first responsive controls */}
          <div className="space-y-3 sm:space-y-4">
            {/* Search bar - full width on mobile */}
            <div className="relative w-full">
              <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-stone-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent min-h-[44px] bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400"
              />
            </div>

            {/* Filter tags - wrap on mobile */}
            <div className="flex flex-wrap items-center gap-2">
              <Tag size={16} className="text-slate-500 dark:text-slate-400 flex-shrink-0" />
              {capsuleTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] flex-shrink-0 ${selectedTags.has(tag)
                    ? 'bg-slate-800 dark:bg-slate-600 text-white'
                    : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600'
                    }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Responsive grid - 2 cols on mobile, up to 6 on larger screens */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
          {filteredItems.map(item => (
            <div
              key={item.id}
              onClick={() => onItemSelect(item)}
              className={`p-3 sm:p-4 rounded-xl border-2 transition-all min-h-[80px] cursor-pointer touch-manipulation ${selectedItem?.id === item.id
                ? 'border-slate-800 dark:border-slate-400 bg-slate-50 dark:bg-slate-700 shadow-sm'
                : 'border-stone-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-500 hover:shadow-md active:scale-95'
                }`}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onItemSelect(item);
                }
              }}
              aria-label={`Select ${formatItemName(item, settings.showBrand)} for outfit building`}
            >
              <div className="text-left">
                <div className="flex items-center gap-2 mb-2">
                  <ColorCircle itemName={item.name} size="md" />
                  <h3 className="font-medium text-slate-800 dark:text-slate-200 leading-tight text-sm sm:text-base">
                    {formatItemName(item, settings.showBrand)}
                  </h3>
                </div>

                {item.capsuleTags && (
                  <div className="flex flex-wrap gap-1">
                    {item.capsuleTags.map(tag => (
                      <span
                        key={tag}
                        className="px-2 py-1 bg-stone-100 dark:bg-slate-600 text-stone-600 dark:text-slate-300 text-xs rounded-md"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-8 sm:py-12">
            <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-base">No items found matching your criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
};