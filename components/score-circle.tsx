'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

import { safeValidate } from '@/lib/utils/validation';
import { OutfitSelectionSchema, type OutfitSelection } from '@/lib/schemas';
import { ScoreBreakdown } from './score-breakdown';

// Score breakdown type for Next.js
export interface ScoreBreakdownData {
  formalityScore: number;
  formalityWeight: number;
  consistencyBonus: number;
  consistencyWeight: number;
  layerAdjustments: Array<{
    itemId: string;
    itemName: string;
    category: string;
    originalScore: number;
    adjustedScore: number;
    weight: number;
    reason: 'covered' | 'visible' | 'accessory';
  }>;
  total: number;
  percentage: number;
}

interface ScoreCircleProps {
  score: number;
  maxScore?: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  outfit?: OutfitSelection;
  breakdown?: ScoreBreakdownData;
  className?: string;
}

export const ScoreCircle: React.FC<ScoreCircleProps> = ({
  score,
  maxScore = 100,
  size = 'md',
  showLabel = true,
  outfit,
  breakdown,
  className = ''
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0, placement: 'top' });
  const circleRef = useRef<HTMLDivElement>(null);
  const percentage = Math.min(Math.round((score / maxScore) * 100), 100);
  
  // Validate outfit if provided
  const validatedOutfit = React.useMemo(() => {
    if (!outfit) return null;
    const validation = safeValidate(OutfitSelectionSchema, outfit);
    if (!validation.success) {
      console.warn('Invalid outfit for score breakdown:', validation.error);
      return null;
    }
    return validation.data;
  }, [outfit]);

  // Calculate breakdown if outfit data is available and no breakdown is provided
  const calculatedBreakdown = React.useMemo(() => {
    if (breakdown) return breakdown;
    if (!validatedOutfit) return null;
    
    // Basic breakdown calculation - this would be enhanced with actual scoring logic
    const items = Object.entries(validatedOutfit)
      .filter(([key, value]) => value && key !== 'tuck_style' && key !== 'loved')
      .map(([key, item]) => ({ key, item: item as any }));
    
    const formalityScores = items
      .map(({ item }) => item?.formality_score || 5)
      .filter(score => typeof score === 'number');
    
    const avgFormality = formalityScores.length > 0 
      ? formalityScores.reduce((a, b) => a + b, 0) / formalityScores.length 
      : 5;
    
    const variance = formalityScores.length > 1
      ? formalityScores.reduce((acc, score) => acc + Math.pow(score - avgFormality, 2), 0) / formalityScores.length
      : 0;
    
    const consistencyBonus = variance < 2 ? 15 : variance < 4 ? 10 : 0;
    
    return {
      formalityScore: Math.round(avgFormality * 10),
      formalityWeight: 0.7,
      consistencyBonus,
      consistencyWeight: 0.3,
      layerAdjustments: items.map(({ key, item }) => ({
        itemId: item?.id || key,
        itemName: item?.name || key,
        category: key,
        originalScore: item?.formality_score || 5,
        adjustedScore: item?.formality_score || 5,
        weight: 1.0,
        reason: 'visible' as const
      })),
      total: percentage,
      percentage
    };
  }, [breakdown, validatedOutfit, percentage]);

  // Update tooltip position when showing
  useEffect(() => {
    const updatePosition = () => {
      if (showTooltip && circleRef.current && calculatedBreakdown) {
        const rect = circleRef.current.getBoundingClientRect();
        const tooltipWidth = 320; // Increased width estimate
        const tooltipHeight = 300; // Estimated height
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const padding = 16; // 16px padding from screen edges
        
        // Calculate horizontal position
        let x = rect.left + rect.width / 2;
        
        // Check if tooltip would overflow on the right
        if (x + tooltipWidth / 2 > viewportWidth - padding) {
          x = viewportWidth - padding - tooltipWidth / 2;
        }
        
        // Check if tooltip would overflow on the left
        if (x - tooltipWidth / 2 < padding) {
          x = padding + tooltipWidth / 2;
        }
        
        // Calculate vertical position
        let y = rect.top - 8; // 8px above the circle
        let placement = 'top';
        
        // Check if tooltip would overflow at the top
        if (y - tooltipHeight < padding) {
          // Position below the circle instead
          y = rect.bottom + 8;
          placement = 'bottom';
        }
        
        // Check if tooltip would overflow at the bottom when positioned below
        if (placement === 'bottom' && y + tooltipHeight > viewportHeight - padding) {
          // Position to the side if there's space
          if (rect.left - tooltipWidth - 8 > padding) {
            // Position to the left
            x = rect.left - 8;
            y = rect.top + rect.height / 2;
            placement = 'left';
          } else if (rect.right + tooltipWidth + 8 < viewportWidth - padding) {
            // Position to the right
            x = rect.right + 8;
            y = rect.top + rect.height / 2;
            placement = 'right';
          } else {
            // Keep it above but adjust y to fit
            y = Math.max(padding + tooltipHeight, rect.top - 8);
            placement = 'top';
          }
        }
        
        setTooltipPosition({
          x: x,
          y: y,
          placement: placement
        });
      }
    };

    updatePosition();

    // Add resize listener to reposition tooltip
    if (showTooltip) {
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, { passive: true });
      
      return () => {
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('scroll', updatePosition);
      };
    }
  }, [showTooltip, calculatedBreakdown]);
  
  const sizeClasses = {
    sm: { container: 'w-12 h-12', text: 'text-xs', stroke: '2' },
    md: { container: 'w-16 h-16', text: 'text-sm', stroke: '3' },
    lg: { container: 'w-20 h-20', text: 'text-base', stroke: '4' }
  };

  const { container, text, stroke } = sizeClasses[size];
  
  // Handle invalid scores
  if (!isFinite(percentage) || isNaN(percentage)) {
    return (
      <div className={`flex flex-col items-center gap-1 ${className}`}>
        <div className={`relative ${container}`}>
          <div className={`flex items-center justify-center w-full h-full ${text} font-semibold text-slate-400`}>
            --
          </div>
        </div>
        {showLabel && (
          <span className="text-xs text-slate-500 font-medium">Invalid Score</span>
        )}
      </div>
    );
  }

  const radius = size === 'sm' ? 18 : size === 'md' ? 26 : 32;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  // Color based on percentage
  const getColor = (pct: number) => {
    if (pct >= 80) return 'text-green-600 dark:text-green-400';
    if (pct >= 60) return 'text-yellow-600 dark:text-yellow-400';
    if (pct >= 40) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-500 dark:text-red-400';
  };

  const getStrokeColor = (pct: number) => {
    if (pct >= 80) return 'stroke-green-500';
    if (pct >= 60) return 'stroke-yellow-500';
    if (pct >= 40) return 'stroke-orange-500';
    return 'stroke-red-500';
  };

  const hasBreakdown = calculatedBreakdown !== null;

  return (
    <>
      <div className={`relative flex flex-col items-center gap-1 ${className}`}>
        <div 
          ref={circleRef}
          className={`relative ${container} ${hasBreakdown ? 'cursor-pointer hover:scale-105 transition-transform duration-200' : ''}`}
          onMouseEnter={() => hasBreakdown && setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          onClick={() => hasBreakdown && setShowTooltip(!showTooltip)}
          role={hasBreakdown ? 'button' : undefined}
          tabIndex={hasBreakdown ? 0 : undefined}
          aria-label={hasBreakdown ? 'View score breakdown' : undefined}
          onKeyDown={(e) => {
            if (hasBreakdown && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault();
              setShowTooltip(!showTooltip);
            }
          }}
        >
          <svg className="transform -rotate-90 w-full h-full" viewBox={`0 0 ${radius * 2 + 8} ${radius * 2 + 8}`}>
            {/* Background circle */}
            <circle
              cx={radius + 4}
              cy={radius + 4}
              r={radius}
              stroke="currentColor"
              strokeWidth={stroke}
              fill="transparent"
              className="text-stone-200 dark:text-slate-600"
            />
            {/* Progress circle */}
            <circle
              cx={radius + 4}
              cy={radius + 4}
              r={radius}
              stroke="currentColor"
              strokeWidth={stroke}
              fill="transparent"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className={`transition-all duration-500 ease-out ${getStrokeColor(percentage)}`}
            />
          </svg>
          {/* Percentage text */}
          <div className={`absolute inset-0 flex items-center justify-center ${text} font-semibold ${getColor(percentage)}`}>
            {percentage}%
          </div>
        </div>
        
        {showLabel && (
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            {hasBreakdown ? 'Outfit Score' : 'Score'}
          </span>
        )}
      </div>

      {/* Portal tooltip */}
      {hasBreakdown && showTooltip && calculatedBreakdown && createPortal(
        <div 
          className="fixed z-[9999] pointer-events-none"
          style={{
            left: tooltipPosition.x,
            top: tooltipPosition.y,
            transform: tooltipPosition.placement === 'top' ? 'translate(-50%, -100%)' :
                      tooltipPosition.placement === 'bottom' ? 'translate(-50%, 0%)' :
                      tooltipPosition.placement === 'left' ? 'translate(-100%, -50%)' :
                      'translate(0%, -50%)'
          }}
        >
          <div className="bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-lg shadow-xl p-4 min-w-[280px] max-w-[320px] relative">
            <ScoreBreakdown breakdown={calculatedBreakdown} showDetails={true} />
            
            {/* Arrow */}
            {tooltipPosition.placement === 'top' && (
              <div className="absolute top-full left-1/2 transform -translate-x-1/2">
                <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-white dark:border-t-slate-800"></div>
                <div className="absolute -top-[1px] left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[7px] border-r-[7px] border-t-[7px] border-transparent border-t-stone-200 dark:border-t-slate-700"></div>
              </div>
            )}
            
            {tooltipPosition.placement === 'bottom' && (
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2">
                <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-b-[6px] border-transparent border-b-white dark:border-b-slate-800"></div>
                <div className="absolute -bottom-[1px] left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[7px] border-r-[7px] border-b-[7px] border-transparent border-b-stone-200 dark:border-b-slate-700"></div>
              </div>
            )}
            
            {tooltipPosition.placement === 'left' && (
              <div className="absolute right-full top-1/2 transform -translate-y-1/2">
                <div className="w-0 h-0 border-t-[6px] border-b-[6px] border-l-[6px] border-transparent border-l-white dark:border-l-slate-800"></div>
                <div className="absolute -left-[1px] top-1/2 transform -translate-y-1/2 w-0 h-0 border-t-[7px] border-b-[7px] border-l-[7px] border-transparent border-l-stone-200 dark:border-l-slate-700"></div>
              </div>
            )}
            
            {tooltipPosition.placement === 'right' && (
              <div className="absolute left-full top-1/2 transform -translate-y-1/2">
                <div className="w-0 h-0 border-t-[6px] border-b-[6px] border-r-[6px] border-transparent border-r-white dark:border-r-slate-800"></div>
                <div className="absolute -right-[1px] top-1/2 transform -translate-y-1/2 w-0 h-0 border-t-[7px] border-b-[7px] border-r-[7px] border-transparent border-r-stone-200 dark:border-r-slate-700"></div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
};