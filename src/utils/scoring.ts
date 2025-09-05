import { OutfitSelection, WardrobeItem } from '../types';

/**
 * Consolidated scoring system for outfits
 * 
 * Scoring breakdown:
 * - Base formality scores: 93% of total (based on selected items)
 * - Style consistency bonus: 7% of total
 * - Total possible: 100%
 * 
 * Required items: shirt, pants, shoes, watch
 * Optional items: jacket, belt
 */

export interface ScoreBreakdown {
    formalityScore: number;
    consistencyBonus: number;
    total: number;
    percentage: number;
}

export const FORMALITY_WEIGHT = 0.93; // 93% of total score
export const CONSISTENCY_WEIGHT = 0.07; // 7% of total score

/**
 * Calculate the formality score component
 * Returns the percentage of formality based on selected items
 */
export const calculateFormalityScore = (selection: OutfitSelection): number => {
    const items = [
        selection.jacket,    // optional
        selection.shirt,     // required
        selection.pants,     // required
        selection.shoes,     // required
        selection.belt,      // optional
        selection.watch      // required
    ];

    const selectedItems = items.filter(item => item?.formalityScore !== undefined);

    if (selectedItems.length === 0) {
        return 0;
    }

    const totalFormalityScore = selectedItems.reduce((score, item) => {
        return score + (item?.formalityScore || 0);
    }, 0);

    const maxPossibleScore = selectedItems.length * 10; // Each item can have max 10 formality
    const formalityPercentage = (totalFormalityScore / maxPossibleScore) * 100;

    // Return 93% of the formality percentage
    return Math.round(formalityPercentage * FORMALITY_WEIGHT);
};

/**
 * Calculate style consistency bonus
 * Rewards outfits where items have similar formality levels
 * Returns up to 7% bonus for perfect consistency
 */
export const calculateConsistencyBonus = (selection: OutfitSelection): number => {
    const items = [
        selection.jacket,
        selection.shirt,
        selection.pants,
        selection.shoes,
        selection.belt,
        selection.watch
    ];

    const formalityScores = items
        .filter((item): item is WardrobeItem => item?.formalityScore !== undefined)
        .map(item => item.formalityScore!);

    if (formalityScores.length < 2) {
        return 0;
    }

    const avgFormality = formalityScores.reduce((a, b) => a + b, 0) / formalityScores.length;
    const variance = formalityScores.reduce((acc, score) =>
        acc + Math.pow(score - avgFormality, 2), 0
    ) / formalityScores.length;

    // Lower variance = more consistent style = higher bonus
    // Variance ranges from 0 (perfect consistency) to ~25 (max inconsistency)
    // Convert to 0-7% bonus scale
    const maxVariance = 25;
    const consistencyRatio = Math.max(0, 1 - (variance / maxVariance));
    const consistencyBonus = consistencyRatio * CONSISTENCY_WEIGHT * 100;

    return Math.round(consistencyBonus);
};

/**
 * Calculate complete outfit score with breakdown
 */
export const calculateOutfitScore = (selection: OutfitSelection): ScoreBreakdown => {
    const formalityScore = calculateFormalityScore(selection);
    const consistencyBonus = calculateConsistencyBonus(selection);

    const total = formalityScore + consistencyBonus;
    const percentage = Math.min(total, 100);

    return {
        formalityScore,
        consistencyBonus,
        total,
        percentage
    };
};

/**
 * Legacy function for backward compatibility
 * @deprecated Use calculateOutfitScore instead
 */
export const scoreOutfit = (selection: OutfitSelection): number => {
    return calculateOutfitScore(selection).percentage;
};