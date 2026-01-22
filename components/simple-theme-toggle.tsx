'use client';

import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import Monitor from 'lucide-react/dist/esm/icons/monitor';
import Moon from 'lucide-react/dist/esm/icons/moon';
import Sun from 'lucide-react/dist/esm/icons/sun';
import { useEffect, useState } from 'react';

/**
 * Simple theme toggle that doesn't require authentication or user preferences
 * Used on public pages like the home page
 */
export function SimpleThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleThemeChange = () => {
    const currentTheme = theme || 'system';
    let newTheme: 'light' | 'dark' | 'system';
    
    // Cycle through themes: light -> dark -> light
    switch (currentTheme) {
      case 'light':
        newTheme = 'dark';
        break;
      case 'dark':
        newTheme = 'light';
        break;
      default:
        newTheme = 'light';
        break;
    }

    setTheme(newTheme);
  };

  if (!mounted) {
    return (
      <Button variant="ghost" size="sm" disabled>
        <Sun className="w-4 h-4" />
      </Button>
    );
  }

  const currentTheme = theme || 'system';

  const getIcon = () => {
    switch (currentTheme) {
      case 'light':
        return <Sun className="w-4 h-4" />;
      case 'dark':
        return <Moon className="w-4 h-4" />;
      default:
        return <Monitor className="w-4 h-4" />;
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleThemeChange}
      title={`Current theme: ${currentTheme}. Click to cycle themes.`}
    >
      {getIcon()}
    </Button>
  );
}