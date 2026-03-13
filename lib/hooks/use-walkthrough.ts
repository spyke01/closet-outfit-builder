'use client';

import { useState, useCallback, useEffect } from 'react';
import { completeWalkthrough } from '@/lib/actions/walkthrough';

interface UseWalkthroughOptions {
  initialCompleted: boolean;
  totalSteps: number;
}

export function useWalkthrough({ initialCompleted, totalSteps }: UseWalkthroughOptions) {
  // null = dismissed/done, 0 = not yet started, 1–N = active step
  const [currentStep, setCurrentStep] = useState<number | null>(
    initialCompleted ? null : 0
  );
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const start = useCallback(() => {
    setCurrentStep(1);
  }, []);

  const advance = useCallback(() => {
    setCurrentStep((prev) => {
      if (prev === null) return null;
      const next = prev + 1;
      if (next > totalSteps) {
        // Completed — persist to server
        completeWalkthrough().catch(() => {});
        return null;
      }
      return next;
    });
  }, [totalSteps]);

  const dismiss = useCallback(() => {
    setCurrentStep(null);
    completeWalkthrough().catch(() => {});
  }, []);

  const isActive = currentStep !== null && currentStep > 0;

  return {
    currentStep,
    isActive,
    prefersReducedMotion,
    start,
    advance,
    dismiss,
  };
}
