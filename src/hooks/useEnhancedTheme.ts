import { useState, useEffect, useCallback } from 'react';

export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

interface EnhancedThemeConfig {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  isDark: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  systemPreference: ResolvedTheme;
}

const STORAGE_KEY = 'enhanced-theme-preference';
const TRANSITION_DURATION = 300; // ms

export const useEnhancedTheme = (): EnhancedThemeConfig => {
  // Get system preference
  const getSystemPreference = useCallback((): ResolvedTheme => {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }, []);

  const [systemPreference, setSystemPreference] = useState<ResolvedTheme>(getSystemPreference);
  
  // Initialize theme from localStorage or system preference
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'system';
    
    const savedTheme = localStorage.getItem(STORAGE_KEY) as Theme;
    if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
      return savedTheme;
    }
    
    return 'system';
  });

  // Resolve the actual theme to apply
  const resolvedTheme: ResolvedTheme = theme === 'system' ? systemPreference : theme;
  const isDark = resolvedTheme === 'dark';

  // Apply theme to document with smooth transition
  const applyTheme = useCallback((newResolvedTheme: ResolvedTheme) => {
    const root = document.documentElement;
    
    // Add transition class for smooth theme switching
    root.style.setProperty('--theme-transition-duration', `${TRANSITION_DURATION}ms`);
    
    // Apply theme class
    if (newResolvedTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Trigger animation
    root.classList.add('animate-theme-transition');
    
    // Remove animation class after transition
    setTimeout(() => {
      root.classList.remove('animate-theme-transition');
    }, TRANSITION_DURATION);
  }, []);

  // Set theme with persistence
  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem(STORAGE_KEY, newTheme);
  }, []);

  // Toggle between light and dark (skips system)
  const toggleTheme = useCallback(() => {
    if (theme === 'system') {
      // If currently system, toggle to opposite of system preference
      setTheme(systemPreference === 'dark' ? 'light' : 'dark');
    } else {
      // Toggle between light and dark
      setTheme(theme === 'light' ? 'dark' : 'light');
    }
  }, [theme, systemPreference, setTheme]);

  // Listen for system preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      const newSystemPreference = e.matches ? 'dark' : 'light';
      setSystemPreference(newSystemPreference);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Apply theme when resolved theme changes
  useEffect(() => {
    applyTheme(resolvedTheme);
  }, [resolvedTheme, applyTheme]);

  // Initialize theme on mount
  useEffect(() => {
    applyTheme(resolvedTheme);
  }, []); // Only run once on mount

  return {
    theme,
    resolvedTheme,
    isDark,
    setTheme,
    toggleTheme,
    systemPreference,
  };
};

// Hook for components that only need to know if dark mode is active
export const useIsDark = (): boolean => {
  const { isDark } = useEnhancedTheme();
  return isDark;
};

// Hook for getting system preference without full theme management
export const useSystemPreference = (): ResolvedTheme => {
  const [systemPreference, setSystemPreference] = useState<ResolvedTheme>(() => {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemPreference(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return systemPreference;
};