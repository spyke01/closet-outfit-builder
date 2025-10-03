import React, { useState, useEffect } from 'react';

export interface FeatureSupport {
  optimistic: boolean;
  suspense: boolean;
  containerQueries: boolean;
  transitions: boolean;
  cssCustomProperties: boolean;
  backdropFilter: boolean;
  gridSubgrid: boolean;
  viewTransitions: boolean;
}

/**
 * Hook for detecting browser feature support and enabling graceful degradation
 * Provides feature detection for modern web APIs and CSS features
 */
export const useFeatureSupport = (): FeatureSupport => {
  const [support, setSupport] = useState<FeatureSupport>({
    optimistic: false,
    suspense: false,
    containerQueries: false,
    transitions: false,
    cssCustomProperties: false,
    backdropFilter: false,
    gridSubgrid: false,
    viewTransitions: false,
  });

  useEffect(() => {
    const detectFeatures = () => {
      // React 19 feature detection
      const hasOptimistic = typeof React !== 'undefined' && 'useOptimistic' in React;
      const hasSuspense = typeof React !== 'undefined' && 'Suspense' in React;
      const hasTransitions = typeof React !== 'undefined' && 'startTransition' in React;

      // CSS feature detection
      const hasContainerQueries = CSS?.supports?.('container-type: inline-size') ?? false;
      const hasCSSCustomProperties = CSS?.supports?.('color: var(--test)') ?? false;
      const hasBackdropFilter = CSS?.supports?.('backdrop-filter: blur(10px)') ?? false;
      const hasGridSubgrid = CSS?.supports?.('grid-template-rows: subgrid') ?? false;

      // View Transitions API detection
      const hasViewTransitions = 'startViewTransition' in document;

      setSupport({
        optimistic: hasOptimistic,
        suspense: hasSuspense,
        containerQueries: hasContainerQueries,
        transitions: hasTransitions,
        cssCustomProperties: hasCSSCustomProperties,
        backdropFilter: hasBackdropFilter,
        gridSubgrid: hasGridSubgrid,
        viewTransitions: hasViewTransitions,
      });
    };

    detectFeatures();
  }, []);

  return support;
};

/**
 * Component wrapper for conditional feature rendering with graceful degradation
 */
export interface ConditionalEnhancementProps {
  feature: keyof FeatureSupport;
  children: React.ReactNode;
  fallback: React.ReactNode;
  className?: string;
}

export const ConditionalEnhancement: React.FC<ConditionalEnhancementProps> = ({
  feature,
  children,
  fallback,
  className = '',
}) => {
  const support = useFeatureSupport();
  
  return React.createElement('div', { className }, support[feature] ? children : fallback);
};

/**
 * Hook for getting feature-aware CSS classes
 */
export const useFeatureAwareClasses = () => {
  const support = useFeatureSupport();

  return {
    containerQuery: support.containerQueries ? '@container' : '',
    backdropBlur: support.backdropFilter ? 'backdrop-blur-sm' : 'bg-opacity-90',
    gridLayout: support.gridSubgrid ? 'grid-template-rows-subgrid' : 'grid',
    customProperties: support.cssCustomProperties ? 'text-text-primary' : 'text-gray-900 dark:text-gray-100',
  };
};