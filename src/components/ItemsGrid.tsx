import React, { useState } from 'react';
import { Search, Tag, Eye, Plus } from 'lucide-react';
import { WardrobeItem, Category, CapsuleTag } from '../types';

interface ItemsGridProps {
  category: Category;
  items: WardrobeItem[];
  selectedItem?: WardrobeItem;
  onItemSelect: (item: WardrobeItem) => void;
  onShowOutfits?: (item: WardrobeItem) => void;
}

const capsuleTags: CapsuleTag[] = ['Refined', 'Adventurer', 'Crossover', 'Shorts'];

export const ItemsGrid: React.FC<ItemsGridProps> = ({ 
  category, 
  items, 
  selectedItem, 
  onItemSelect,
  onShowOutfits
}) => {
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
    <div className="flex-1 p-6">
      <div className="mb-6">
        <h2 className="text-xl font-light text-slate-800 mb-4">
          Choose {category}
        </h2>
        
        <div className="flex items-center gap-4 mb-4">
          <div className="relative flex-1 max-w-md">
            <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Tag size={16} className="text-slate-500" />
            {capsuleTags.map(tag => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
                  selectedTags.has(tag)
                    ? 'bg-slate-800 text-white'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredItems.map(item => (
          <div
            key={item.id}
            className={`p-4 rounded-xl border-2 transition-all min-h-[140px] ${
              selectedItem?.id === item.id
                ? 'border-slate-800 bg-slate-50 shadow-sm'
                : 'border-stone-200 bg-white hover:border-slate-300 hover:shadow-md'
            }`}
          >
            <div className="text-left mb-3">
              <h3 className="font-medium text-slate-800 mb-2 leading-tight">
                {item.name}
              </h3>
              
              {item.capsuleTags && (
                <div className="flex flex-wrap gap-1">
                  {item.capsuleTags.map(tag => (
                    <span
                      key={tag}
                      className="px-2 py-1 bg-stone-100 text-stone-600 text-xs rounded-md"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => onItemSelect(item)}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-slate-800 text-white text-sm rounded-lg hover:bg-slate-700 transition-colors"
              >
                <Plus size={14} />
                Add
              </button>
              
              {onShowOutfits && (
                <button
                  onClick={() => onShowOutfits(item)}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-white text-slate-600 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <Eye size={14} />
                  View
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-12">
          <p className="text-slate-500">No items found matching your criteria.</p>
        </div>
      )}
    </div>
  );
};