import React from 'react';
import { ScoreBreakdown as ScoreBreakdownType } from '../utils/scoring';

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
      
      <div className="space-y-2 text-sm">
        <div className="flex justify-between items-center">
          <span className="text-slate-600 dark:text-slate-400">Formality</span>
          <span className="font-medium text-slate-800 dark:text-slate-200">{breakdown.formalityScore}%</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-slate-600 dark:text-slate-400">Consistency</span>
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