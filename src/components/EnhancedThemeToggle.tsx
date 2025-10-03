import React, { useState } from 'react';
import { Moon, Sun, Monitor, ChevronDown } from 'lucide-react';
import { useEnhancedTheme, Theme } from '../hooks/useEnhancedTheme';

interface EnhancedThemeToggleProps {
  variant?: 'button' | 'dropdown';
  showLabel?: boolean;
  className?: string;
}

export const EnhancedThemeToggle: React.FC<EnhancedThemeToggleProps> = ({
  variant = 'button',
  showLabel = false,
  className = ''
}) => {
  const { theme, resolvedTheme, setTheme, toggleTheme, systemPreference } = useEnhancedTheme();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const getThemeIcon = (themeType: Theme | 'resolved') => {
    const iconSize = 18;
    const iconClass = "text-text-secondary transition-colors duration-200";
    
    switch (themeType) {
      case 'light':
        return <Sun size={iconSize} className={iconClass} />;
      case 'dark':
        return <Moon size={iconSize} className={iconClass} />;
      case 'system':
        return <Monitor size={iconSize} className={iconClass} />;
      case 'resolved':
        return resolvedTheme === 'dark' 
          ? <Moon size={iconSize} className={iconClass} />
          : <Sun size={iconSize} className={iconClass} />;
      default:
        return <Sun size={iconSize} className={iconClass} />;
    }
  };

  const getThemeLabel = (themeType: Theme) => {
    switch (themeType) {
      case 'light':
        return 'Light';
      case 'dark':
        return 'Dark';
      case 'system':
        return `System (${systemPreference})`;
      default:
        return 'Light';
    }
  };

  if (variant === 'dropdown') {
    return (
      <div className={`relative ${className}`}>
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center gap-2 p-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 border border-gray-300 dark:border-slate-600 transition-all duration-200 touch-target"
          aria-label="Theme selector"
          aria-expanded={isDropdownOpen}
          aria-haspopup="true"
        >
          {getThemeIcon('resolved')}
          {showLabel && (
            <span className="text-sm text-text-primary font-medium">
              {getThemeLabel(theme)}
            </span>
          )}
          <ChevronDown 
            size={14} 
            className={`text-text-secondary transition-transform duration-200 ${
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
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg shadow-lg z-20 animate-fade-in">
              <div className="py-1">
                {(['light', 'dark', 'system'] as Theme[]).map((themeOption) => (
                  <button
                    key={themeOption}
                    onClick={() => {
                      setTheme(themeOption);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors duration-200 ${
                      theme === themeOption ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-gray-100'
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
      className={`p-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 border border-gray-300 dark:border-slate-600 transition-all duration-200 touch-target flex items-center justify-center gap-2 ${className}`}
      aria-label={`Switch to ${resolvedTheme === 'light' ? 'dark' : 'light'} mode`}
      title={`Current theme: ${getThemeLabel(theme)}`}
    >
      {getThemeIcon('resolved')}
      {showLabel && (
        <span className="text-sm text-text-primary font-medium">
          {getThemeLabel(theme)}
        </span>
      )}
    </button>
  );
};

// Simplified version for backward compatibility
export const SimpleThemeToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { toggleTheme, resolvedTheme } = useEnhancedTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`p-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 transition-colors touch-target flex items-center justify-center ${className}`}
      aria-label={`Switch to ${resolvedTheme === 'light' ? 'dark' : 'light'} mode`}
    >
      {resolvedTheme === 'light' ? (
        <Moon size={18} className="text-text-secondary" />
      ) : (
        <Sun size={18} className="text-text-secondary" />
      )}
    </button>
  );
};