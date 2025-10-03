import { useState, useEffect, useCallback } from 'react';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'theme-preference';

export const useTheme = () => {
  // Initialize theme from localStorage (already set by HTML script)
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'dark';
    
    // Theme should already be set by the HTML script
    const savedTheme = localStorage.getItem(STORAGE_KEY) as Theme;
    return (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) ? savedTheme : 'dark';
  });

  // Apply theme to document
  const applyTheme = useCallback((newTheme: Theme) => {
    const root = document.documentElement;
    
    // Remove any existing theme classes
    root.classList.remove('dark', 'light');
    
    if (newTheme === 'dark') {
      root.classList.add('dark');
      console.log('Applied dark theme - classList:', root.classList.toString());
    } else {
      root.classList.add('light');
      console.log('Applied light theme - classList:', root.classList.toString());
    }
    
    // Force a style recalculation by setting a CSS custom property
    root.style.setProperty('--theme-mode', newTheme);
    
    // Trigger a repaint to ensure styles are applied
    setTimeout(() => {
      root.style.setProperty('--theme-timestamp', Date.now().toString());
    }, 0);
  }, []);

  // Set theme with persistence and immediate application
  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem(STORAGE_KEY, newTheme);
    applyTheme(newTheme);
  }, [applyTheme]);

  // Toggle between light and dark
  const toggleTheme = useCallback(() => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  }, [theme, setTheme]);

  // Apply theme when component mounts or theme changes
  useEffect(() => {
    applyTheme(theme);
  }, [theme, applyTheme]);

  // Apply theme immediately on first load
  useEffect(() => {
    applyTheme(theme);
  }, []); // Only run once on mount

  return {
    theme,
    setTheme,
    toggleTheme,
    isDark: theme === 'dark'
  };
};