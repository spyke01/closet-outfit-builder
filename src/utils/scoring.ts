import { OutfitSelection, WardrobeItem, LayerAdjustment, ScoreBreakdown } from '../types';

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

// ScoreBreakdown interface is now imported from types

export const FORMALITY_WEIGHT = 0.93; // 93% of total score
export const CONSISTENCY_WEIGHT = 0.07; // 7% of total score

/**
 * Calculate layer-aware formality score with visibility detection
 * Applies weight reduction for covered items and tracks adjustments
 */
export const calculateLayerAwareFormalityScore = (selection: OutfitSelection): {
    score: number;
    adjustments: LayerAdjustment[];
} => {
    const adjustments: LayerAdjustment[] = [];
    
    // Determine visibility of each layer
    const isUndershirtCovered = !!(selection.shirt || selection.jacket);
    const isShirtCovered = !!selection.jacket;
    
    // Define items with their weights based on visibility and type
    const items = [
        { item: selection.jacket, weight: 1.0, reason: 'visible' as const },
        { 
            item: selection.shirt, 
            weight: isShirtCovered ? 0.7 : 1.0, 
            reason: isShirtCovered ? 'covered' as const : 'visible' as const 
        },
        { 
            item: selection.undershirt, 
            weight: isUndershirtCovered ? 0.3 : 1.0, 
            reason: isUndershirtCovered ? 'covered' as const : 'visible' as const 
        },
        { item: selection.pants, weight: 1.0, reason: 'visible' as const },
        { item: selection.shoes, weight: 1.0, reason: 'visible' as const },
        { item: selection.belt, weight: 0.8, reason: 'accessory' as const },
        { item: selection.watch, weight: 0.8, reason: 'accessory' as const }
    ];
    
    // Calculate weighted formality score
    let totalWeightedScore = 0;
    let totalWeight = 0;
    
    items.forEach(({ item, weight, reason }) => {
        if (item?.formalityScore !== undefined) {
            const adjustedScore = item.formalityScore * weight;
            totalWeightedScore += adjustedScore;
            totalWeight += weight;
            
            adjustments.push({
                itemId: item.id,
                itemName: item.name,
                category: item.category,
                originalScore: item.formalityScore,
                adjustedScore,
                weight,
                reason
            });
        }
    });
    
    const averageScore = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
    const formalityPercentage = (averageScore / 10) * 100 * FORMALITY_WEIGHT;
    
    return {
        score: Math.round(formalityPercentage),
        adjustments
    };
};

/**
 * Calculate the formality score component (legacy version)
 * Returns the percentage of formality based on selected items
 */
export const calculateFormalityScore = (selection: OutfitSelection): number => {
    const items = [
        selection.jacket,    // optional
        selection.shirt,     // required
        selection.undershirt, // optional
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
        selection.undershirt,
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
 * Calculate complete outfit score with enhanced breakdown including layer adjustments
 */
export const calculateOutfitScore = (selection: OutfitSelection): ScoreBreakdown => {
    const layerAwareResult = calculateLayerAwareFormalityScore(selection);
    const consistencyBonus = calculateConsistencyBonus(selection);

    const total = layerAwareResult.score + consistencyBonus;
    const percentage = Math.min(total, 100);

    return {
        formalityScore: layerAwareResult.score,
        formalityWeight: FORMALITY_WEIGHT,
        consistencyBonus,
        consistencyWeight: CONSISTENCY_WEIGHT,
        layerAdjustments: layerAwareResult.adjustments,
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