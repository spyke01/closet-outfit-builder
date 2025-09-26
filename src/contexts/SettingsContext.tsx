import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserSettings } from '../types';

// Default settings values
const DEFAULT_SETTINGS: UserSettings = {
  showBrand: false,
};

// Settings context interface
interface SettingsContextType {
  settings: UserSettings;
  updateSettings: (newSettings: Partial<UserSettings>) => void;
  resetSettings: () => void;
}

// Create the context
const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

// Settings validation function
const validateSettings = (settings: unknown): UserSettings => {
  const validated: UserSettings = { ...DEFAULT_SETTINGS };
  
  if (settings && typeof settings === 'object') {
    // Validate showBrand
    if (typeof settings.showBrand === 'boolean') {
      validated.showBrand = settings.showBrand;
    }
  }
  
  return validated;
};

// Local storage key
const SETTINGS_STORAGE_KEY = 'closet-outfit-builder-settings';

// Settings provider component
interface SettingsProviderProps {
  children: ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const storedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (storedSettings) {
        const parsed = JSON.parse(storedSettings);
        const validated = validateSettings(parsed);
        setSettings(validated);
      }
    } catch (error) {
      console.warn('Failed to load settings from localStorage:', error);
      // Use default settings if loading fails
      setSettings(DEFAULT_SETTINGS);
    }
  }, []);

  // Save settings to localStorage whenever they change
  const saveSettings = (newSettings: UserSettings) => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
    } catch (error) {
      console.warn('Failed to save settings to localStorage:', error);
    }
  };

  // Update settings function
  const updateSettings = (newSettings: Partial<UserSettings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    const validatedSettings = validateSettings(updatedSettings);
    setSettings(validatedSettings);
    saveSettings(validatedSettings);
  };

  // Reset settings to defaults
  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
    saveSettings(DEFAULT_SETTINGS);
  };

  const contextValue: SettingsContextType = {
    settings,
    updateSettings,
    resetSettings,
  };

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  );
};

// Custom hook to use settings
export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

export default SettingsContext;