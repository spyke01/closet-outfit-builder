import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { OutfitSelection } from '../types';
import { calculateOutfitScore } from '../utils/scoring';
import { ScoreBreakdown } from './ScoreBreakdown';

interface ScoreCircleProps {
    score: number;
    maxScore?: number;
    size?: 'sm' | 'md' | 'lg';
    showLabel?: boolean;
    outfit?: OutfitSelection; // Optional outfit data for breakdown
}

export const ScoreCircle: React.FC<ScoreCircleProps> = ({
    score,
    maxScore = 100,
    size = 'md',
    showLabel = true,
    outfit
}) => {
    const [showTooltip, setShowTooltip] = useState(false);
    const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
    const circleRef = useRef<HTMLDivElement>(null);
    const percentage = Math.min(Math.round((score / maxScore) * 100), 100);
    
    // Calculate breakdown if outfit data is available
    const breakdown = outfit ? calculateOutfitScore(outfit) : null;

    // Update tooltip position when showing
    useEffect(() => {
        if (showTooltip && circleRef.current) {
            const rect = circleRef.current.getBoundingClientRect();
            const tooltipWidth = 240; // Approximate width of tooltip (220px min-width + padding)
            const viewportWidth = window.innerWidth;
            const padding = 16; // 16px padding from screen edges
            
            let x = rect.left + rect.width / 2;
            
            // Check if tooltip would overflow on the right
            if (x + tooltipWidth / 2 > viewportWidth - padding) {
                x = viewportWidth - padding - tooltipWidth / 2;
            }
            
            // Check if tooltip would overflow on the left
            if (x - tooltipWidth / 2 < padding) {
                x = padding + tooltipWidth / 2;
            }
            
            setTooltipPosition({
                x: x,
                y: rect.top - 8 // 8px above the circle
            });
        }
    }, [showTooltip]);
    
    const sizeClasses = {
        sm: { container: 'w-12 h-12', text: 'text-xs', stroke: '2' },
        md: { container: 'w-16 h-16', text: 'text-sm', stroke: '3' },
        lg: { container: 'w-20 h-20', text: 'text-base', stroke: '4' }
    };

    const { container, text, stroke } = sizeClasses[size];
    
    // Handle invalid scores
    if (!isFinite(percentage) || isNaN(percentage)) {
        return (
            <div className="flex flex-col items-center gap-1">
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
        if (pct >= 80) return 'text-green-600';
        if (pct >= 60) return 'text-yellow-600';
        if (pct >= 40) return 'text-orange-600';
        return 'text-red-500';
    };

    const getStrokeColor = (pct: number) => {
        if (pct >= 80) return 'stroke-green-500';
        if (pct >= 60) return 'stroke-yellow-500';
        if (pct >= 40) return 'stroke-orange-500';
        return 'stroke-red-500';
    };

    return (
        <>
            <div className="relative flex flex-col items-center gap-1">
                <div 
                    ref={circleRef}
                    className={`relative ${container} ${breakdown ? 'cursor-pointer hover:scale-105 transition-transform duration-200' : ''}`}
                    onMouseEnter={() => breakdown && setShowTooltip(true)}
                    onMouseLeave={() => setShowTooltip(false)}
                    onClick={() => breakdown && setShowTooltip(!showTooltip)}
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
                        className="text-stone-200"
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
                    <span className="text-xs text-slate-500 font-medium">
                        {breakdown ? 'Outfit Score' : 'Formality Score'}
                    </span>
                )}
            </div>

            {/* Portal tooltip */}
            {breakdown && showTooltip && createPortal(
                <div 
                    className="fixed z-[9999] pointer-events-none"
                    style={{
                        left: tooltipPosition.x,
                        top: tooltipPosition.y,
                        transform: 'translate(-50%, -100%)'
                    }}
                >
                    <div className="bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-lg shadow-xl p-4 min-w-[220px] max-w-[280px] mb-2">
                        <ScoreBreakdown breakdown={breakdown} showDetails={true} />
                        {/* Arrow pointing down */}
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2">
                            <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-white dark:border-t-slate-800"></div>
                            <div className="absolute -top-[1px] left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[7px] border-r-[7px] border-t-[7px] border-transparent border-t-stone-200 dark:border-t-slate-700"></div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
};