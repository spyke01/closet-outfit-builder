import React from 'react';
import { WardrobeItem, Category } from '../../types';
import {
    JacketSVG,
    TrenchCoatSVG,
    MacCoatSVG,
    TShirtSVG,
    LongSleeveSVG,
    PoloSVG,
    ChinosSVG,
    ShortsSVG,
    LoafersSVG,
    SneakersSVG,
    BeltSVG,
    DressWatchSVG,
    DiverWatchSVG
} from './index';

export type ClothingItemType =
    | 'jacket'
    | 'trench'
    | 'mac'
    | 'tshirt'
    | 'longsleeve'
    | 'polo'
    | 'chinos'
    | 'shorts'
    | 'loafers'
    | 'sneakers'
    | 'belt'
    | 'dress-watch'
    | 'diver-watch';

interface ClothingItemSVGProps {
    item: WardrobeItem;
    className?: string;
    style?: React.CSSProperties;
}

// Map wardrobe items to SVG types based on name patterns
const getClothingType = (item: WardrobeItem): ClothingItemType => {
    const name = item.name.toLowerCase();
    const category = item.category;

    switch (category) {
        case 'Jacket/Overshirt':
            if (name.includes('trench')) return 'trench';
            if (name.includes('mac')) return 'mac';
            return 'jacket';

        case 'Shirt':
            if (name.includes('polo')) return 'polo';
            if (name.includes('long sleeve') || name.includes('ocbd') || name.includes('button')) return 'longsleeve';
            return 'longsleeve'; // Default for shirts

        case 'Undershirt':
            return 'tshirt';

        case 'Pants':
            if (name.includes('shorts')) return 'shorts';
            return 'chinos';

        case 'Shoes':
            if (name.includes('tennis') || name.includes('sneaker') || name.includes('athletic')) return 'sneakers';
            return 'loafers';

        case 'Belt':
            return 'belt';

        case 'Watch':
            if (name.includes('diver') || name.includes('sport')) return 'diver-watch';
            return 'dress-watch';

        default:
            return 'tshirt'; // Fallback
    }
};

// Extract color from item name or use default colors
export const extractItemColor = (item: WardrobeItem): string => {
    const name = item.name.toLowerCase();

    // Direct color mapping from common color names
    const colorMap: Record<string, string> = {
        // Basic colors
        'white': '#ffffff',
        'black': '#000000',
        'gray': '#6b7280',
        'grey': '#6b7280',
        'navy': '#1e3a8a',
        'blue': '#3b82f6',
        'red': '#ef4444',
        'green': '#10b981',
        'brown': '#8b4513',
        'tan': '#d2b48c',
        'beige': '#f5f5dc',
        'khaki': '#c3b091',
        'olive': '#6b7c32',
        'burgundy': '#800020',
        'maroon': '#800000',
        'pink': '#ec4899',
        'purple': '#8b5cf6',
        'yellow': '#eab308',
        'orange': '#f97316',
        'cream': '#fffdd0',
        'ivory': '#fffff0',
        'charcoal': '#36454f',
        'silver': '#c0c0c0',
        'gold': '#ffd700',

        // Specific clothing colors
        'denim': '#4682b4',
        'indigo': '#4b0082',
        'camel': '#c19a6b',
        'cognac': '#9a463d',
        'mahogany': '#c04000',
        'chestnut': '#954535',
        'walnut': '#773f1a',
        'espresso': '#3c2415'
    };

    // Check for color in parentheses first (standardized format)
    const parenMatch = name.match(/\(([^)]+)\)/);
    if (parenMatch) {
        const colorInParens = parenMatch[1].toLowerCase();
        for (const [colorName, colorValue] of Object.entries(colorMap)) {
            if (colorInParens.includes(colorName)) {
                return colorValue;
            }
        }
    }

    // Check for color at the beginning of the name
    for (const [colorName, colorValue] of Object.entries(colorMap)) {
        if (name.startsWith(colorName) || name.includes(` ${colorName} `) || name.includes(`${colorName} `)) {
            return colorValue;
        }
    }

    // Category-based default colors
    switch (item.category) {
        case 'Jacket/Overshirt':
            return '#374151'; // Dark gray
        case 'Shirt':
            return '#e2e8f0'; // Light gray
        case 'Undershirt':
            return '#ffffff'; // White
        case 'Pants':
            return '#8b7355'; // Khaki/tan
        case 'Shoes':
            return '#8b4513'; // Brown
        case 'Belt':
            return '#8b4513'; // Brown
        case 'Watch':
            return '#c0c0c0'; // Silver
        default:
            return '#6b7280'; // Medium gray
    }
};

// Layer z-index mapping for proper stacking
export const getLayerZIndex = (category: Category): number => {
    switch (category) {
        case 'Jacket/Overshirt': return 50; // Top layer
        case 'Shirt': return 40;
        case 'Undershirt': return 30;
        case 'Pants': return 20;
        case 'Shoes': return 10;
        case 'Belt': return 25; // Above pants, below shirts
        case 'Watch': return 60; // Accessory, always visible
        default: return 0;
    }
};

export const ClothingItemSVG: React.FC<ClothingItemSVGProps> = ({
    item,
    className = '',
    style = {}
}) => {
    const clothingType = getClothingType(item);
    const color = extractItemColor(item);
    const zIndex = getLayerZIndex(item.category);

    const svgClassName = `clothing-item-svg ${className}`;

    // Create a wrapper div to handle styling including z-index
    const wrapperStyle: React.CSSProperties = {
        zIndex,
        ...style
    };

    // Render the appropriate SVG component wrapped in a div for styling
    const renderSVG = () => {
        switch (clothingType) {
            case 'jacket':
                return <JacketSVG color={color} className={svgClassName} />;
            case 'trench':
                return <TrenchCoatSVG color={color} className={svgClassName} />;
            case 'mac':
                return <MacCoatSVG color={color} className={svgClassName} />;
            case 'tshirt':
                return <TShirtSVG color={color} className={svgClassName} />;
            case 'longsleeve':
                return <LongSleeveSVG color={color} className={svgClassName} />;
            case 'polo':
                return <PoloSVG color={color} className={svgClassName} />;
            case 'chinos':
                return <ChinosSVG color={color} className={svgClassName} />;
            case 'shorts':
                return <ShortsSVG color={color} className={svgClassName} />;
            case 'loafers':
                return <LoafersSVG color={color} className={svgClassName} />;
            case 'sneakers':
                return <SneakersSVG color={color} className={svgClassName} />;
            case 'belt':
                return <BeltSVG color={color} className={svgClassName} />;
            case 'dress-watch':
                return <DressWatchSVG color={color} className={svgClassName} />;
            case 'diver-watch':
                return <DiverWatchSVG color={color} className={svgClassName} />;
            default:
                return <TShirtSVG color={color} className={svgClassName} />;
        }
    };

    return (
        <div style={wrapperStyle} className="clothing-item-wrapper">
            {renderSVG()}
        </div>
    );
};