import React from 'react';
import { Shirt } from 'lucide-react';
import { OutfitSelection, GeneratedOutfit } from '../types';
import { ScoreCircle } from './ScoreCircle';
import { ColorCircle } from './ColorCircle';

interface OutfitCardProps {
    outfit: OutfitSelection | GeneratedOutfit;
    variant?: 'detailed' | 'compact';
    showScore?: boolean;
    showSource?: boolean;
    score?: number; // Optional override score
    className?: string;
    onClick?: () => void;
}

export const OutfitCard: React.FC<OutfitCardProps> = ({
    outfit,
    variant = 'compact',
    showScore = true,
    showSource = false,
    score: propScore,
    className = '',
    onClick
}) => {
    const isGenerated = 'source' in outfit;
    const score = propScore !== undefined ? propScore : (isGenerated ? outfit.score : 0);

    const ItemRow: React.FC<{
        label: string;
        value?: string;
        labelColor?: string;
        showColor?: boolean;
    }> = ({ label, value, labelColor = 'text-slate-500', showColor = false }) => {
        if (!value) return null;

        const labelSize = variant === 'detailed' ? 'text-sm' : 'text-xs';
        const valueSize = variant === 'detailed' ? 'text-base font-medium' : 'text-sm font-medium';
        const spacing = variant === 'detailed' ? 'py-2' : 'py-1';

        return (
            <div className={`flex justify-between items-center ${spacing}`}>
                <span className={`${labelSize} ${labelColor} uppercase tracking-wide`}>
                    {label}
                </span>
                <div className="flex items-center gap-2">
                    <span className={`${valueSize} text-slate-800`}>
                        {value}
                    </span>
                    {showColor && <ColorCircle itemName={value} size={variant === 'detailed' ? 'md' : 'sm'} />}
                </div>
            </div>
        );
    };

    const coreItems = [
        { label: 'Jacket', value: outfit.jacket?.name, showColor: true },
        { label: 'Shirt', value: outfit.shirt?.name, showColor: true },
        { label: 'Pants', value: outfit.pants?.name, showColor: true },
        { label: 'Shoes', value: outfit.shoes?.name, showColor: true }
    ];

    const accessories = [
        { label: 'Belt', value: outfit.belt?.name, showColor: true },
        { label: 'Watch', value: outfit.watch?.name, showColor: false },
        { label: 'Style', value: outfit.tuck, showColor: false }
    ];

    const hasAccessories = accessories.some(item => item.value);

    if (variant === 'detailed') {
        return (
            <div
                className={`bg-white rounded-2xl shadow-sm border border-stone-200 p-8 ${className}`}
                onClick={onClick}
            >
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
                        {showScore && <ScoreCircle score={score} size="lg" />}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wide border-b border-stone-200 pb-2">
                            Core Pieces
                        </h4>
                        {coreItems.map(item => (
                            <ItemRow
                                key={item.label}
                                label={item.label}
                                value={item.value}
                                labelColor="text-slate-600"
                                showColor={item.showColor}
                            />
                        ))}
                    </div>

                    <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wide border-b border-stone-200 pb-2">
                            Finishing Touches
                        </h4>
                        <ItemRow label="Belt" value={outfit.belt?.name} labelColor="text-slate-600" showColor={true} />
                        <ItemRow label="Watch" value={outfit.watch?.name} labelColor="text-slate-600" showColor={false} />
                        <ItemRow label="Style" value={outfit.tuck} labelColor="text-slate-600" showColor={false} />
                    </div>
                </div>
            </div>
        );
    }

    // Compact variant
    return (
        <div
            className={`bg-stone-50 rounded-xl p-5 border border-stone-200 hover:shadow-md transition-shadow ${onClick ? 'cursor-pointer' : ''} ${className}`}
            onClick={onClick}
        >
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Shirt size={16} className="text-slate-600" />
                    {showSource && isGenerated && (
                        <span className="text-sm font-medium text-slate-800">
                            {outfit.source === 'curated' ? 'Curated' : 'Generated'}
                        </span>
                    )}
                </div>
                {showScore && <ScoreCircle score={score} size="sm" showLabel={false} />}
            </div>

            <div className="space-y-3">
                {coreItems.map(item => (
                    <ItemRow
                        key={item.label}
                        label={item.label}
                        value={item.value}
                        showColor={item.showColor}
                    />
                ))}

                {hasAccessories && (
                    <div className="border-t border-stone-300 pt-3 mt-3">
                        {accessories.map(item => (
                            <ItemRow
                                key={item.label}
                                label={item.label}
                                value={item.value}
                                showColor={item.showColor}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};