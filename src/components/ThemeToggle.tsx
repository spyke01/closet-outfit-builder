import React, { useState } from 'react';
import { Moon, Sun, Monitor, ChevronDown } from 'lucide-react';
import { useTheme, Theme } from '../hooks/useTheme';

interface ThemeToggleProps {
  variant?: 'button' | 'dropdown';
  showLabel?: boolean;
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  variant = 'button',
  showLabel = false,
  className = ''
}) => {
  const { theme, setTheme, toggleTheme } = useTheme();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const getThemeIcon = (themeType: Theme) => {
    const iconSize = 18;
    const iconClass = "text-slate-600 dark:text-slate-300 transition-colors duration-200";
    
    return themeType === 'dark' 
      ? <Moon size={iconSize} className={iconClass} />
      : <Sun size={iconSize} className={iconClass} />;
  };

  const getThemeLabel = (themeType: Theme) => {
    return themeType === 'dark' ? 'Dark' : 'Light';
  };

  if (variant === 'dropdown') {
    return (
      <div className={`relative ${className}`}>
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center gap-2 p-2 rounded-lg bg-stone-100 hover:bg-stone-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-stone-300 dark:border-slate-600 transition-all duration-200 touch-target"
          aria-label="Theme selector"
          aria-expanded={isDropdownOpen}
          aria-haspopup="true"
        >
          {getThemeIcon(theme)}
          {showLabel && (
            <span className="text-sm text-slate-800 dark:text-slate-200 font-medium">
              {getThemeLabel(theme)}
            </span>
          )}
          <ChevronDown 
            size={14} 
            className={`text-slate-600 dark:text-slate-300 transition-transform duration-200 ${
              isDropdownOpen ? 'rotate-180' : ''
            }`} 
          />
        </button>

        {isDropdownOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setIsDropdownOpen(false)}
            />
            
            {/* Dropdown menu */}
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 border border-stone-300 dark:border-slate-600 rounded-lg shadow-lg z-20 animate-fade-in">
              <div className="py-1">
                {(['light', 'dark'] as Theme[]).map((themeOption) => (
                  <button
                    key={themeOption}
                    onClick={() => {
                      setTheme(themeOption);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-stone-100 dark:hover:bg-slate-700 transition-colors duration-200 ${
                      theme === themeOption ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 'text-slate-900 dark:text-slate-100'
                    }`}
                  >
                    {getThemeIcon(themeOption)}
                    <span className="text-sm font-medium">
                      {getThemeLabel(themeOption)}
                    </span>
                    {theme === themeOption && (
                      <div className="ml-auto w-2 h-2 bg-blue-500 rounded-full" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // Button variant (simple toggle)
  return (
    <button
      onClick={toggleTheme}
      className={`p-2 rounded-lg bg-stone-100 hover:bg-stone-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-all duration-200 touch-target flex items-center justify-center gap-2 ${className}`}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      title={`Current theme: ${getThemeLabel(theme)}`}
    >
      {getThemeIcon(theme)}
      {showLabel && (
        <span className="text-sm text-slate-800 dark:text-slate-200 font-medium">
          {getThemeLabel(theme)}
        </span>
      )}
    </button>
  );
};

// Simplified version for backward compatibility
export const SimpleThemeToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { toggleTheme, theme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`p-2 rounded-lg bg-stone-100 hover:bg-stone-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors touch-target flex items-center justify-center ${className}`}
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