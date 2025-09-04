import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg bg-stone-100 hover:bg-stone-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors touch-target"
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'light' ? (
        <Moon size={18} className="text-slate-600 dark:text-slate-300" />
      ) : (
        <Sun size={18} className="text-slate-600 dark:text-slate-300" />
      )}
    </button>
  );
};