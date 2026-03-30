'use client';

import { useEffect } from 'react';
import { useTheme } from 'next-themes';

export function ThemeDomSync() {
  const { theme, resolvedTheme } = useTheme();

  useEffect(() => {
    const root = document.documentElement;
    const effectiveTheme = theme === 'system' ? resolvedTheme : theme;

    if (effectiveTheme === 'light') {
      root.setAttribute('data-theme', 'light');
      return;
    }

    root.removeAttribute('data-theme');
  }, [resolvedTheme, theme]);

  return null;
}
