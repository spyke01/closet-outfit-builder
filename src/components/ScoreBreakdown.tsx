import React from 'react';
import { ScoreBreakdown as ScoreBreakdownType, LayerAdjustment } from '../types';

interface WeightIndicatorProps {
  reason: LayerAdjustment['reason'];
  weight: number;
}

const WeightIndicator: React.FC<WeightIndicatorProps> = ({ reason, weight }) => {
  const getIndicatorStyle = () => {
    if (weight === 1.0) {
      return 'bg-green-500 text-white';
    } else if (weight >= 0.7) {
      return 'bg-yellow-500 text-white';
    } else {
      return 'bg-red-500 text-white';
    }
  };

  const getReasonText = () => {
    switch (reason) {
      case 'visible':
        return 'Visible';
      case 'covered':
        return 'Covered';
      case 'accessory':
        return 'Accessory';
      default:
        return '';
    }
  };

  return (
    <span 
      className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${getIndicatorStyle()}`}
      title={`${getReasonText()} - Weight: ${weight}`}
    >
      {weight === 1.0 ? '●' : weight >= 0.7 ? '◐' : '○'}
    </span>
  );
};

interface ScoreBreakdownProps {
  breakdown: ScoreBreakdownType;
  showDetails?: boolean;
}

export const ScoreBreakdown: React.FC<ScoreBreakdownProps> = ({
  breakdown,
  showDetails = false
}) => {
  if (!showDetails) {
    return (
      <div className="text-center">
        <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">
          {breakdown.percentage}%
        </div>
        <div className="text-sm text-slate-500 dark:text-slate-400">
          {breakdown.total} points
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="text-center">
        <div className="text-xl font-bold text-slate-800 dark:text-slate-200">
          {breakdown.percentage}%
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400">
          Total Score
        </div>
      </div>
      
      <div className="space-y-3 text-sm">
        {/* Formality Score with Weight */}
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-slate-600 dark:text-slate-400">
              Formality ({Math.round(breakdown.formalityWeight * 100)}% weight)
            </span>
            <span className="font-medium text-slate-800 dark:text-slate-200">{breakdown.formalityScore}%</span>
          </div>
          
          {/* Layer Adjustments */}
          {breakdown.layerAdjustments.length > 0 && (
            <div className="ml-4 space-y-1">
              {breakdown.layerAdjustments.map((adjustment, index) => (
                <div key={index} className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 dark:text-slate-500 flex items-center gap-1">
                    <span className="truncate max-w-[120px]" title={adjustment.itemName}>
                      {adjustment.itemName}
                    </span>
                    <WeightIndicator reason={adjustment.reason} weight={adjustment.weight} />
                  </span>
                  <span className="text-slate-600 dark:text-slate-400 font-mono">
                    {adjustment.originalScore} × {adjustment.weight} = {adjustment.adjustedScore.toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Consistency Bonus with Weight */}
        <div className="flex justify-between items-center">
          <span className="text-slate-600 dark:text-slate-400">
            Consistency ({Math.round(breakdown.consistencyWeight * 100)}% weight)
          </span>
          <span className="font-medium text-green-600">+{breakdown.consistencyBonus}%</span>
        </div>
        
        <div className="border-t border-stone-200 dark:border-slate-600 pt-2 mt-2">
          <div className="flex justify-between items-center font-medium">
            <span className="text-slate-700 dark:text-slate-300">Total</span>
            <span className="text-slate-800 dark:text-slate-200">{breakdown.total}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};