import { useEffect, useState } from 'react';

/**
 * Hook to detect user's motion preference
 * Returns true if user prefers reduced motion
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Check initial preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    // Listen for changes
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return prefersReducedMotion;
}

/**
 * Get animation class names based on motion preference
 * @param normalAnimation - Animation classes for normal motion
 * @param reducedAnimation - Animation classes for reduced motion (optional, defaults to no animation)
 */
export function getAnimationClass(
  normalAnimation: string,
  reducedAnimation: string = ''
): string {
  if (typeof window === 'undefined') {
    return normalAnimation;
  }

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return prefersReducedMotion ? reducedAnimation : normalAnimation;
}
