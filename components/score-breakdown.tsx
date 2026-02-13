'use client';

import React from 'react';
import { ScoreBreakdownData } from './score-circle';

interface WeightIndicatorProps {
  reason: 'covered' | 'visible' | 'accessory';
  weight: number;
}

const WeightIndicator = React.memo<WeightIndicatorProps>(({ reason, weight }) => {
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
});

WeightIndicator.displayName = 'WeightIndicator';

interface ScoreBreakdownProps {
  breakdown: ScoreBreakdownData;
  showDetails?: boolean;
}

export const ScoreBreakdown = React.memo<ScoreBreakdownProps>(({
  breakdown,
  showDetails = false
}) => {
  if (!showDetails) {
    return (
      <div className="text-center">
        <div className="text-2xl font-bold text-foreground">
          {breakdown.percentage}%
        </div>
        <div className="text-sm text-muted-foreground">
          {breakdown.total} points
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="text-center">
        <div className="text-xl font-bold text-foreground">
          {breakdown.percentage}%
        </div>
        <div className="text-xs text-muted-foreground">
          Total Score
        </div>
      </div>
      
      <div className="space-y-3 text-sm">
        {/* Formality Score with Weight */}
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">
              Formality ({Math.round(breakdown.formalityWeight * 100)}% weight)
            </span>
            <span className="font-medium text-foreground">{breakdown.formalityScore}%</span>
          </div>
          
          {/* Layer Adjustments */}
          {breakdown.layerAdjustments.length > 0 && (
            <div className="ml-4 space-y-1">
              {breakdown.layerAdjustments.map((adjustment, index) => (
                <div key={index} className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <span className="truncate max-w-[120px]" title={adjustment.itemName}>
                      {adjustment.itemName}
                    </span>
                    <WeightIndicator reason={adjustment.reason} weight={adjustment.weight} />
                  </span>
                  <span className="text-muted-foreground font-mono">
                    {adjustment.originalScore} × {adjustment.weight} = {adjustment.adjustedScore.toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Consistency Bonus with Weight */}
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">
            Style Consistency ({Math.round(breakdown.consistencyWeight * 100)}% weight)
          </span>
          <span className="font-medium text-green-600 dark:text-green-400">+{breakdown.consistencyBonus}%</span>
        </div>
        
        {/* Compatibility Factors */}
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground font-medium">
            Compatibility Factors:
          </div>
          <div className="ml-2 space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Color Harmony</span>
              <span className="text-muted-foreground">Good</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Formality Match</span>
              <span className="text-muted-foreground">
                {breakdown.consistencyBonus >= 15 ? 'Excellent' : 
                 breakdown.consistencyBonus >= 10 ? 'Good' : 'Fair'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Seasonal Fit</span>
              <span className="text-muted-foreground">Appropriate</span>
            </div>
          </div>
        </div>
        
        <div className="border-t border-border pt-2 mt-2">
          <div className="flex justify-between items-center font-medium">
            <span className="text-muted-foreground">Total</span>
            <span className="text-foreground">{breakdown.total}%</span>
          </div>
        </div>
      </div>
    </div>
  );
});

ScoreBreakdown.displayName = 'ScoreBreakdown';