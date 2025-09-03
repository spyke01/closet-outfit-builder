import React from 'react';
import { Shirt, RefreshCw } from 'lucide-react';
import { OutfitSelection } from '../types';
import { OutfitCard } from './OutfitCard';
import { useOutfitEngine } from '../hooks/useOutfitEngine';

interface OutfitDisplayProps {
  selection: OutfitSelection;
  onRandomize: () => void;
}

export const OutfitDisplay: React.FC<OutfitDisplayProps> = ({ selection, onRandomize }) => {
  const { scoreOutfit } = useOutfitEngine();
  const hasCompleteOutfit = selection.shirt && selection.pants && selection.shoes;
  const outfitScore = hasCompleteOutfit ? scoreOutfit(selection) : 0;

  if (!hasCompleteOutfit) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <Shirt size={48} className="text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-light text-slate-600 mb-2">
            Start Building Your Look
          </h3>
          <p className="text-slate-500 mb-6">
            Select a category above to begin composing your outfit, or use Randomize for instant inspiration.
          </p>
          <button
            onClick={onRandomize}
            className="flex items-center gap-2 px-6 py-3 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors mx-auto"
          >
            <RefreshCw size={18} />
            Get Random Outfit
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6">
      <div className="max-w-2xl mx-auto">
        <OutfitCard
          outfit={selection}
          variant="detailed"
          showScore={true}
          score={outfitScore}
        />

        <div className="mt-8 text-center">
          <button
            onClick={onRandomize}
            className="flex items-center gap-2 px-8 py-3 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors mx-auto"
          >
            <RefreshCw size={18} />
            Try Another Combination
          </button>
        </div>
      </div>
    </div>
  );
};