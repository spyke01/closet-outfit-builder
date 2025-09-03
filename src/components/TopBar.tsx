import React from 'react';
import { Shuffle, Grid3X3 } from 'lucide-react';

interface TopBarProps {
  onRandomize: () => void;
  onShowAll: () => void;
  onTitleClick: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onRandomize, onShowAll, onTitleClick }) => {
  return (
    <div className="bg-white border-b border-stone-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <button 
          onClick={onTitleClick}
          className="text-2xl font-light text-slate-800 tracking-wide hover:text-slate-600 transition-colors"
        >
          What to Wear
        </button>
        
        <div className="flex items-center gap-3">
          <button
            onClick={onRandomize}
            className="flex items-center gap-2 px-6 py-3 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors min-h-[44px] font-medium"
          >
            <Shuffle size={18} />
            Randomize
          </button>
          
          <button
            onClick={onShowAll}
            className="flex items-center gap-2 px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors min-h-[44px] font-medium"
          >
            <Grid3X3 size={18} />
            Show All
          </button>
        </div>
      </div>
    </div>
  );
};