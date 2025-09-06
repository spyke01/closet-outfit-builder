import React from 'react';
import { Category } from '../types';

interface AnchorRowProps {
  selectedCategory: Category | null;
  onCategorySelect: (category: Category) => void;
}

const categories: Category[] = ['Jacket/Overshirt', 'Shirt', 'Undershirt', 'Pants', 'Shoes'];

export const AnchorRow: React.FC<AnchorRowProps> = ({ selectedCategory, onCategorySelect }) => {
  return (
    <div className="bg-stone-50 dark:bg-slate-900 border-b border-stone-200 dark:border-slate-700 px-4 sm:px-6 py-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-2">
        <span className="text-sm font-medium text-slate-600 dark:text-slate-400 sm:mr-4">Start with:</span>
        <div className="flex flex-wrap items-center gap-2 sm:gap-2">
          {categories.map((category, index) => (
            <React.Fragment key={category}>
              <button
                onClick={() => onCategorySelect(category)}
                className={`px-3 sm:px-4 py-2 rounded-full text-sm font-medium transition-all min-h-[44px] flex-shrink-0 ${
                  selectedCategory === category
                    ? 'bg-slate-800 dark:bg-slate-700 text-white shadow-sm'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600'
                }`}
              >
                {category}
              </button>
              {index < categories.length - 1 && (
                <span className="text-slate-400 dark:text-slate-500 mx-1 hidden sm:inline">·</span>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};