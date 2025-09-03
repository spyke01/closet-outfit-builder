import React from 'react';

interface ScoreCircleProps {
    score: number;
    maxScore?: number;
    size?: 'sm' | 'md' | 'lg';
    showLabel?: boolean;
}

export const ScoreCircle: React.FC<ScoreCircleProps> = ({
    score,
    maxScore = 60, // Reasonable max based on our scoring system
    size = 'md',
    showLabel = true
}) => {
    const percentage = Math.min(Math.round((score / maxScore) * 100), 100);

    const sizeClasses = {
        sm: { container: 'w-12 h-12', text: 'text-xs', stroke: '2' },
        md: { container: 'w-16 h-16', text: 'text-sm', stroke: '3' },
        lg: { container: 'w-20 h-20', text: 'text-base', stroke: '4' }
    };

    const { container, text, stroke } = sizeClasses[size];
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
        <div className="flex flex-col items-center gap-1">
            <div className={`relative ${container}`}>
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
                <span className="text-xs text-slate-500 font-medium">Formality Score</span>
            )}
        </div>
    );
};