import React from 'react';
import { ArrowLeft, Settings, Moon, Sun } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { useTheme } from '../hooks/useTheme';

interface SettingsPageProps {
  onBack: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onBack }) => {
  const { settings, updateSettings, resetSettings } = useSettings();
  const { theme, toggleTheme } = useTheme();

  const handleShowBrandToggle = () => {
    updateSettings({ showBrand: !settings.showBrand });
  };

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-stone-200 dark:border-slate-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="flex items-center justify-center w-10 h-10 rounded-lg bg-stone-100 dark:bg-slate-700 hover:bg-stone-200 dark:hover:bg-slate-600 transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft size={20} className="text-slate-700 dark:text-slate-300" />
            </button>
            <div className="flex items-center gap-3">
              <Settings size={24} className="text-slate-700 dark:text-slate-300" />
              <h1 className="text-2xl font-light text-slate-800 dark:text-slate-200">Settings</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="space-y-8">
          {/* Display Settings Section */}
          <section>
            <h2 className="text-lg font-medium text-slate-800 dark:text-slate-200 mb-4">
              Display Settings
            </h2>
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-stone-200 dark:border-slate-700 p-6">
              <div className="space-y-6">
                {/* Show Brand Toggle */}
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-base font-medium text-slate-800 dark:text-slate-200 mb-1">
                      Show Brand Names
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Display brand information in item names when available (e.g., "Ralph Lauren OCBD (White)")
                    </p>
                  </div>
                  <div className="ml-4">
                    <button
                      onClick={handleShowBrandToggle}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 ${
                        settings.showBrand
                          ? 'bg-green-600 dark:bg-green-500'
                          : 'bg-stone-200 dark:bg-slate-700'
                      }`}
                      role="switch"
                      aria-checked={settings.showBrand}
                      aria-label="Toggle brand display"
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          settings.showBrand ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Theme Toggle */}
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-base font-medium text-slate-800 dark:text-slate-200 mb-1">
                      Dark Mode
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Switch between light and dark theme for better viewing experience
                    </p>
                  </div>
                  <div className="ml-4 flex items-center gap-3">
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <Sun size={16} className={theme === 'light' ? 'text-slate-800 dark:text-slate-200' : ''} />
                      <span className="hidden sm:inline">Light</span>
                    </div>
                    <button
                      onClick={toggleTheme}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 ${
                        theme === 'dark'
                          ? 'bg-green-600 dark:bg-green-500'
                          : 'bg-stone-200 dark:bg-slate-700'
                      }`}
                      role="switch"
                      aria-checked={theme === 'dark'}
                      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <Moon size={16} className={theme === 'dark' ? 'text-slate-800 dark:text-slate-200' : ''} />
                      <span className="hidden sm:inline">Dark</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* About Section */}
          <section>
            <h2 className="text-lg font-medium text-slate-800 dark:text-slate-200 mb-4">
              About
            </h2>
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-stone-200 dark:border-slate-700 p-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-medium text-slate-800 dark:text-slate-200 mb-2">
                    Closet Outfit Builder
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    A smart wardrobe management and outfit generation application that helps you create 
                    and discover clothing combinations from your personal wardrobe.
                  </p>
                </div>
                <div className="pt-4 border-t border-stone-200 dark:border-slate-700">
                  <button
                    onClick={resetSettings}
                    className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                  >
                    Reset all settings to defaults
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};