import React from 'react';
import { Lock, Unlock } from 'lucide-react';
import { OutfitSelection, Category } from '../types';

interface SelectionStripProps {
  selection: OutfitSelection;
  onToggleLock: (category: Category) => void;
  onClearSelection: (category: Category) => void;
}

export const SelectionStrip: React.FC<SelectionStripProps> = ({ 
  selection, 
  onToggleLock, 
  onClearSelection 
}) => {
  const categories: { key: keyof OutfitSelection; label: string; category: Category }[] = [
    { key: 'jacket', label: 'Jacket', category: 'Jacket/Overshirt' },
    { key: 'shirt', label: 'Shirt', category: 'Shirt' },
    { key: 'pants', label: 'Pants', category: 'Pants' },
    { key: 'shoes', label: 'Shoes', category: 'Shoes' },
    { key: 'belt', label: 'Belt', category: 'Belt' },
    { key: 'watch', label: 'Watch', category: 'Watch' },
  ];

  const hasSelections = categories.some(cat => selection[cat.key]);

  if (!hasSelections) {
    return null;
  }

  return (
    <div className="bg-white border-b border-stone-200 px-6 py-4 sticky top-0 z-10">
      <div className="flex items-center gap-4 overflow-x-auto">
        <span className="text-sm font-medium text-slate-600 whitespace-nowrap">Current Look:</span>
        
        <div className="flex items-center gap-3">
          {categories.map(({ key, label, category }) => {
            const item = selection[key] as any;
            if (!item) return null;

            const isLocked = selection.locked?.has(category);

            return (
              <div
                key={category}
                className="flex items-center gap-2 bg-stone-50 rounded-lg px-3 py-2 min-h-[44px] border border-stone-200"
              >
                <div className="flex flex-col">
                  <span className="text-xs text-slate-500 uppercase tracking-wide">{label}</span>
                  <span className="text-sm font-medium text-slate-800 truncate max-w-32">
                    {item.name}
                  </span>
                </div>
                
                <div className="flex items-center gap-1 ml-2">
                  <button
                    onClick={() => onToggleLock(category)}
                    className="p-1 hover:bg-stone-200 rounded transition-colors"
                    title={isLocked ? 'Unlock' : 'Lock'}
                  >
                    {isLocked ? (
                      <Lock size={14} className="text-slate-600" />
                    ) : (
                      <Unlock size={14} className="text-slate-400" />
                    )}
                  </button>
                  
                  <button
                    onClick={() => onClearSelection(category)}
                    className="p-1 hover:bg-stone-200 rounded transition-colors text-slate-400 hover:text-slate-600"
                    title="Remove"
                  >
                    ×
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {selection.tuck && (
          <div className="bg-blue-50 rounded-lg px-3 py-2 border border-blue-200">
            <span className="text-xs text-blue-600 uppercase tracking-wide">Tuck</span>
            <div className="text-sm font-medium text-blue-800">{selection.tuck}</div>
          </div>
        )}
      </div>
    </div>
  );
};