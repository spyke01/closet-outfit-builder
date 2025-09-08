import React, { useState, ErrorInfo } from 'react';
import { RotateCcw, Eye, AlertTriangle, Heart } from 'lucide-react';
import { OutfitSelection, GeneratedOutfit } from '../types';
import { ScoreCircle } from './ScoreCircle';
import { ColorCircle } from './ColorCircle';
import { OutfitLayout } from './OutfitLayout';
import { useSettings } from '../contexts/SettingsContext';
import { formatItemName } from '../utils/itemUtils';

// Error boundary component for visual layout
class VisualLayoutErrorBoundary extends React.Component<
    { children: React.ReactNode; fallback?: React.ReactNode },
    { hasError: boolean; error?: Error }
> {
    constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // Error caught and handled silently
    }

    render() {
        if (this.state.hasError) {
            return this.props.fallback || (
                <div className="flex items-center justify-center h-32 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                    <div className="text-center text-red-600 dark:text-red-400">
                        <AlertTriangle size={24} className="mx-auto mb-2" />
                        <div className="text-sm">Visual layout unavailable</div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

interface OutfitCardProps {
    outfit: OutfitSelection | GeneratedOutfit;
    variant?: 'detailed' | 'compact';
    showScore?: boolean;
    showSource?: boolean;
    score?: number; // Optional override score
    className?: string;
    onClick?: () => void;
    enableFlip?: boolean; // New prop to enable flip functionality
    defaultFlipped?: boolean; // New prop to set initial flip state
}

export const OutfitCard: React.FC<OutfitCardProps> = ({
    outfit,
    variant = 'compact',
    showScore = true,
    showSource = false,
    score: propScore,
    className = '',
    onClick,
    enableFlip = false,
    defaultFlipped = false
}) => {
    const { settings } = useSettings();
    const isGenerated = 'source' in outfit;
    const score = propScore !== undefined ? propScore : (isGenerated ? outfit.score : 0);
    const [isFlipped, setIsFlipped] = useState(defaultFlipped);
    const [isLoading, setIsLoading] = useState(false);

    const handleFlip = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent triggering parent onClick
        if (!enableFlip) return;
        
        setIsLoading(true);
        setIsFlipped(!isFlipped);
        
        // Simulate loading time for SVG rendering
        setTimeout(() => {
            setIsLoading(false);
        }, 300);
    };

    const handleCardClick = () => {
        if (onClick && !enableFlip) {
            onClick();
        }
    };

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
                    <span className={`${valueSize} text-slate-800 dark:text-slate-200`}>
                        {value}
                    </span>
                    {showColor && <ColorCircle itemName={value} size={variant === 'detailed' ? 'md' : 'sm'} />}
                </div>
            </div>
        );
    };

    const coreItems = [
        { label: 'Jacket/Overshirt', value: outfit.jacket ? formatItemName(outfit.jacket, settings.showBrand) : undefined, showColor: true },
        { label: 'Shirt', value: outfit.shirt ? formatItemName(outfit.shirt, settings.showBrand) : undefined, showColor: true },
        { label: 'Undershirt', value: outfit.undershirt ? formatItemName(outfit.undershirt, settings.showBrand) : undefined, showColor: true },
        { label: 'Pants', value: outfit.pants ? formatItemName(outfit.pants, settings.showBrand) : undefined, showColor: true },
        { label: 'Shoes', value: outfit.shoes ? formatItemName(outfit.shoes, settings.showBrand) : undefined, showColor: true }
    ];

    const accessories = [
        { label: 'Belt', value: outfit.belt ? formatItemName(outfit.belt, settings.showBrand) : undefined, showColor: true },
        { label: 'Watch', value: outfit.watch ? formatItemName(outfit.watch, settings.showBrand) : undefined, showColor: false },
        { label: 'Style', value: outfit.tuck, showColor: false }
    ];

    const hasAccessories = accessories.some(item => item.value);

    if (variant === 'detailed') {
        // If flip is not enabled, render the original detailed card
        if (!enableFlip) {
            return (
                <div
                    className={`bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-stone-200 dark:border-slate-700 p-8 ${className}`}
                    onClick={onClick}
                >
                    <div className="text-center mb-8">
                        <div className="flex items-center justify-center gap-6 mb-4">
                            <div>
                                <div className="flex items-center justify-center gap-2 mb-2">
                                    <h3 className="text-2xl font-light text-slate-800 dark:text-slate-200">
                                        Your Curated Outfit
                                    </h3>
                                    {outfit.loved && (
                                        <Heart size={20} className="text-red-500 fill-red-500" />
                                    )}
                                </div>
                                <div className="flex items-center justify-center gap-2 mb-2">
                                    {outfit.loved ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                                            <Heart size={12} className="fill-current" />
                                            Loved
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                            Curated
                                        </span>
                                    )}
                                </div>
                                <p className="text-slate-600 dark:text-slate-400">
                                    A carefully composed outfit ready to wear
                                </p>
                            </div>
                            {showScore && <ScoreCircle score={score} size="lg" outfit={outfit} />}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide border-b border-stone-200 dark:border-slate-600 pb-2">
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
                            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide border-b border-stone-200 dark:border-slate-600 pb-2">
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

        // Flip-enabled detailed card
        return (
            <div className={`flip-card ${className}`} style={{ perspective: '1000px', minHeight: '600px' }}>
                <div 
                    className={`flip-card-inner ${isFlipped ? 'flipped' : ''}`}
                    style={{
                        position: 'relative',
                        width: '100%',
                        height: '100%',
                        minHeight: '600px',
                        textAlign: 'center',
                        transition: 'transform 0.6s',
                        transformStyle: 'preserve-3d',
                        transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
                    }}
                >
                    {/* Front face (text view) */}
                    <div 
                        className="flip-card-face flip-card-front"
                        style={{
                            width: '100%',
                            height: '100%',
                            backfaceVisibility: 'hidden',
                            transform: 'rotateY(0deg)'
                        }}
                    >
                        <div
                            className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-stone-200 dark:border-slate-700 p-8"
                            onClick={handleCardClick}
                        >
                            <div className="text-center mb-8">
                                <div className="flex items-center justify-center gap-6 mb-4">
                                    <div>
                                        <div className="flex items-center justify-center gap-2 mb-2">
                                            <h3 className="text-2xl font-light text-slate-800 dark:text-slate-200">
                                                Your Curated Outfit
                                            </h3>
                                            {outfit.loved && (
                                                <Heart size={20} className="text-red-500 fill-red-500" />
                                            )}
                                        </div>
                                        <div className="flex items-center justify-center gap-2 mb-2">
                                            {outfit.loved ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                                                    <Heart size={12} className="fill-current" />
                                                    Loved
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                                    Curated
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-slate-600 dark:text-slate-400">
                                            A carefully composed outfit ready to wear
                                        </p>
                                    </div>
                                    {showScore && <ScoreCircle score={score} size="lg" outfit={outfit} />}
                                </div>
                                <button
                                    onClick={handleFlip}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors text-sm font-medium"
                                    disabled={isLoading}
                                >
                                    <Eye size={16} />
                                    {isLoading ? 'Loading...' : 'View Mockup'}
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide border-b border-stone-200 dark:border-slate-600 pb-2">
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
                                    <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide border-b border-stone-200 dark:border-slate-600 pb-2">
                                        Finishing Touches
                                    </h4>
                                    <ItemRow label="Belt" value={outfit.belt?.name} labelColor="text-slate-600" showColor={true} />
                                    <ItemRow label="Watch" value={outfit.watch?.name} labelColor="text-slate-600" showColor={false} />
                                    <ItemRow label="Style" value={outfit.tuck} labelColor="text-slate-600" showColor={false} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Back face (visual view) */}
                    <div 
                        className="flip-card-face flip-card-back"
                        style={{
                            width: '100%',
                            height: '100%',
                            backfaceVisibility: 'hidden',
                            transform: 'rotateY(180deg)'
                        }}
                    >
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-stone-200 dark:border-slate-700 p-8">
                            <div className="text-center mb-6">
                                <div className="flex items-center justify-center gap-4 mb-4">
                                    <h3 className="text-2xl font-light text-slate-800 dark:text-slate-200">
                                        Outfit Mockup
                                    </h3>
                                    {showScore && <ScoreCircle score={score} size="md" outfit={outfit} />}
                                </div>
                                <button
                                    onClick={handleFlip}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm font-medium"
                                    disabled={isLoading}
                                >
                                    <RotateCcw size={16} />
                                    {isLoading ? 'Loading...' : 'Back to Details'}
                                </button>
                            </div>

                            <div className="flex justify-center items-center flex-1 min-h-[400px]">
                                {isLoading ? (
                                    <div className="flex items-center justify-center h-64">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                                    </div>
                                ) : (
                                    <VisualLayoutErrorBoundary>
                                        <OutfitLayout 
                                            selection={outfit} 
                                            size="large"
                                            className="mx-auto"
                                        />
                                    </VisualLayoutErrorBoundary>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Compact variant
    // If flip is not enabled, render the original compact card
    if (!enableFlip) {
        return (
            <div
                className={`bg-stone-50 dark:bg-slate-800 rounded-xl p-5 border border-stone-200 dark:border-slate-700 hover:shadow-md transition-shadow ${onClick ? 'cursor-pointer' : ''} ${className}`}
                onClick={onClick}
            >
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        {showSource && (
                            <div className="flex items-center gap-2">
                                {outfit.loved ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                                        <Heart size={10} className="fill-current" />
                                        Loved
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                        {isGenerated && outfit.source === 'curated' ? 'Curated' : 'Generated'}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                    {showScore && <ScoreCircle score={score} size="sm" showLabel={false} outfit={outfit} />}
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
                        <div className="border-t border-stone-300 dark:border-slate-600 pt-3 mt-3">
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
    }

    // Flip-enabled compact card
    return (
        <div className={`flip-card ${className}`} style={{ perspective: '1000px', minHeight: '300px' }}>
            <div 
                className={`flip-card-inner ${isFlipped ? 'flipped' : ''}`}
                style={{
                    position: 'relative',
                    width: '100%',
                    height: '100%',
                    minHeight: '300px',
                    textAlign: 'center',
                    transition: 'transform 0.6s',
                    transformStyle: 'preserve-3d',
                    transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
                }}
            >
                {/* Front face (text view) */}
                <div 
                    className="flip-card-face flip-card-front"
                    style={{
                        width: '100%',
                        height: '100%',
                        backfaceVisibility: 'hidden',
                        transform: 'rotateY(0deg)'
                    }}
                >
                    <div
                        className={`bg-stone-50 dark:bg-slate-800 rounded-xl p-5 border border-stone-200 dark:border-slate-700 hover:shadow-md transition-shadow ${onClick && !enableFlip ? 'cursor-pointer' : ''}`}
                        onClick={handleCardClick}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <button
                                onClick={handleFlip}
                                className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors text-xs font-medium"
                                disabled={isLoading}
                            >
                                <Eye size={12} />
                                {isLoading ? 'Loading...' : 'View Mockup'}
                            </button>
                            <div className="flex items-center gap-2">
                                {showScore && <ScoreCircle score={score} size="sm" showLabel={false} outfit={outfit} />}
                                {showSource && (
                                    <div className="flex items-center gap-1">
                                        {outfit.loved ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                                                <Heart size={8} className="fill-current" />
                                                Loved
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                                {isGenerated && outfit.source === 'curated' ? 'Curated' : 'Generated'}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
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
                                <div className="border-t border-stone-300 dark:border-slate-600 pt-3 mt-3">
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
                </div>

                {/* Back face (visual view) */}
                <div 
                    className="flip-card-face flip-card-back"
                    style={{
                        width: '100%',
                        height: '100%',
                        backfaceVisibility: 'hidden',
                        transform: 'rotateY(180deg)'
                    }}
                >
                    <div className="bg-stone-50 dark:bg-slate-800 rounded-xl p-5 border border-stone-200 dark:border-slate-700">
                        <div className="flex items-center justify-between mb-4">
                            <button
                                onClick={handleFlip}
                                className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-500 hover:bg-gray-600 text-white rounded-md transition-colors text-xs font-medium"
                                disabled={isLoading}
                            >
                                <RotateCcw size={12} />
                                {isLoading ? 'Loading...' : 'Back to Details'}
                            </button>
                            <div className="flex items-center gap-2">
                                {showScore && <ScoreCircle score={score} size="sm" showLabel={false} outfit={outfit} />}
                                <div className="flex items-center gap-1">
                                    <span className="text-xs text-slate-500 dark:text-slate-400">
                                        Visual Mockup
                                    </span>
                                    {outfit.loved && (
                                        <Heart size={12} className="text-red-500 fill-red-500" />
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-center items-center flex-1 min-h-[200px]">
                            {isLoading ? (
                                <div className="flex items-center justify-center h-32">
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                                </div>
                            ) : (
                                <VisualLayoutErrorBoundary
                                    fallback={
                                        <div className="flex items-center justify-center h-32 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                                            <div className="text-center text-red-600 dark:text-red-400">
                                                <AlertTriangle size={16} className="mx-auto mb-1" />
                                                <div className="text-xs">Visual unavailable</div>
                                            </div>
                                        </div>
                                    }
                                >
                                    <OutfitLayout 
                                        selection={outfit} 
                                        size="small"
                                        className="mx-auto"
                                    />
                                </VisualLayoutErrorBoundary>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};