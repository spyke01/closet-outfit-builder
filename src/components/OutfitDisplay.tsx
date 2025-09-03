import React from 'react';
import { Shirt, RefreshCw } from 'lucide-react';
import { OutfitSelection } from '../types';
import { ScoreCircle } from './ScoreCircle';
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
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-8">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-6 mb-4">
              <div>
                <h3 className="text-2xl font-light text-slate-800 mb-2">
                  Your Current Look
                </h3>
                <p className="text-slate-600">
                  A carefully composed outfit ready to wear
                </p>
              </div>
              <ScoreCircle score={outfitScore} size="lg" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wide border-b border-stone-200 pb-2">
                Core Pieces
              </h4>
              
              {selection.jacket && (
                <div className="flex justify-between items-center py-2">
                  <span className="text-slate-600">Jacket</span>
                  <span className="font-medium text-slate-800">{selection.jacket.name}</span>
                </div>
              )}
              
              <div className="flex justify-between items-center py-2">
                <span className="text-slate-600">Shirt</span>
                <span className="font-medium text-slate-800">{selection.shirt?.name}</span>
              </div>
              
              <div className="flex justify-between items-center py-2">
                <span className="text-slate-600">Pants</span>
                <span className="font-medium text-slate-800">{selection.pants?.name}</span>
              </div>
              
              <div className="flex justify-between items-center py-2">
                <span className="text-slate-600">Shoes</span>
                <span className="font-medium text-slate-800">{selection.shoes?.name}</span>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wide border-b border-stone-200 pb-2">
                Finishing Touches
              </h4>
              
              {selection.belt && (
                <div className="flex justify-between items-center py-2">
                  <span className="text-blue-600">Belt</span>
                  <span className="font-medium text-slate-800">{selection.belt.name}</span>
                </div>
              )}
              
              {selection.watch && (
                <div className="flex justify-between items-center py-2">
                  <span className="text-blue-600">Watch</span>
                  <span className="font-medium text-slate-800">{selection.watch.name}</span>
                </div>
              )}
              
              {selection.tuck && (
                <div className="flex justify-between items-center py-2">
                  <span className="text-green-600">Style</span>
                  <span className="font-medium text-slate-800">{selection.tuck}</span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-stone-200 text-center">
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
    </div>
  );
};