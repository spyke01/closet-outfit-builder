import React from 'react';
import { Category } from '../types';

interface AnchorRowProps {
  selectedCategory: Category | null;
  onCategorySelect: (category: Category) => void;
}

const categories: Category[] = ['Jacket/Overshirt', 'Shirt', 'Pants', 'Shoes'];

export const AnchorRow: React.FC<AnchorRowProps> = ({ selectedCategory, onCategorySelect }) => {
  return (
    <div className="bg-stone-50 border-b border-stone-200 px-4 sm:px-6 py-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-2">
        <span className="text-sm font-medium text-slate-600 sm:mr-4">Start with:</span>
        <div className="flex flex-wrap items-center gap-2 sm:gap-2">
          {categories.map((category, index) => (
            <React.Fragment key={category}>
              <button
                onClick={() => onCategorySelect(category)}
                className={`px-3 sm:px-4 py-2 rounded-full text-sm font-medium transition-all min-h-[44px] flex-shrink-0 ${
                  selectedCategory === category
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {category}
              </button>
              {index < categories.length - 1 && (
                <span className="text-slate-400 mx-1 hidden sm:inline">·</span>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};