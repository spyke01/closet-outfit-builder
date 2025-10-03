import { useTheme } from '../hooks/useTheme';

/**
 * Component that initializes the theme on app startup
 * This ensures the theme is applied immediately when the app loads
 */
export const ThemeInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // The useTheme hook handles all the initialization and application logic
  useTheme();

  return <>{children}</>;
};