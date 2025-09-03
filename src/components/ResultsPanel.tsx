import React from 'react';
import { X, Shirt } from 'lucide-react';
import { GeneratedOutfit } from '../types';

interface ResultsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  outfits: GeneratedOutfit[];
  anchorItemName?: string;
}

export const ResultsPanel: React.FC<ResultsPanelProps> = ({ 
  isOpen, 
  onClose, 
  outfits, 
  anchorItemName 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-stone-200">
          <div>
            <h2 className="text-2xl font-light text-slate-800">
              {anchorItemName ? `Outfits featuring ${anchorItemName}` : 'All Outfits'}
            </h2>
            <p className="text-slate-600 mt-1">{outfits.length} combinations found</p>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
          >
            <X size={24} className="text-slate-600" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {outfits.map(outfit => (
              <div
                key={outfit.id}
                className="bg-stone-50 rounded-xl p-5 border border-stone-200 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Shirt size={16} className="text-slate-600" />
                    <span className="text-sm font-medium text-slate-800">
                      {outfit.source === 'curated' ? 'Curated' : 'Generated'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 bg-white px-2 py-1 rounded">
                    Score: {outfit.score}
                  </div>
                </div>

                <div className="space-y-3">
                  {outfit.jacket && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500 uppercase tracking-wide">Jacket</span>
                      <span className="text-sm text-slate-800 font-medium">{outfit.jacket.name}</span>
                    </div>
                  )}
                  
                  {outfit.shirt && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500 uppercase tracking-wide">Shirt</span>
                      <span className="text-sm text-slate-800 font-medium">{outfit.shirt.name}</span>
                    </div>
                  )}
                  
                  {outfit.pants && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500 uppercase tracking-wide">Pants</span>
                      <span className="text-sm text-slate-800 font-medium">{outfit.pants.name}</span>
                    </div>
                  )}
                  
                  {outfit.shoes && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500 uppercase tracking-wide">Shoes</span>
                      <span className="text-sm text-slate-800 font-medium">{outfit.shoes.name}</span>
                    </div>
                  )}

                  {(outfit.belt || outfit.watch) && (
                    <div className="border-t border-stone-300 pt-3 mt-3">
                      {outfit.belt && (
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs text-blue-600 uppercase tracking-wide">Belt</span>
                          <span className="text-sm text-slate-700">{outfit.belt.name}</span>
                        </div>
                      )}
                      
                      {outfit.watch && (
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-blue-600 uppercase tracking-wide">Watch</span>
                          <span className="text-sm text-slate-700">{outfit.watch.name}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {outfit.tuck && (
                    <div className="flex justify-between items-center pt-2 border-t border-stone-300">
                      <span className="text-xs text-green-600 uppercase tracking-wide">Style</span>
                      <span className="text-sm text-slate-700">{outfit.tuck}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {outfits.length === 0 && (
            <div className="text-center py-12">
              <p className="text-slate-500">No valid outfits found for this selection.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};