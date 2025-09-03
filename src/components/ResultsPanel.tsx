import React from 'react';
import { X } from 'lucide-react';
import { GeneratedOutfit } from '../types';
import { OutfitCard } from './OutfitCard';

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
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
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
              <OutfitCard
                key={outfit.id}
                outfit={outfit}
                variant="compact"
                showScore={true}
                showSource={true}
              />
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