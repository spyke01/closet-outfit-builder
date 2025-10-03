import React from 'react';
import { EnhancedThemeToggle, SimpleThemeToggle } from '../components/EnhancedThemeToggle';
import { ResponsiveOutfitCard } from '../components/ResponsiveOutfitCard';
import { useEnhancedTheme } from '../hooks/useEnhancedTheme';
import { GeneratedOutfit } from '../types';

const mockOutfit: GeneratedOutfit = {
  id: 'demo-outfit-1',
  shirt: { id: '1', name: 'Blue Oxford Shirt', category: 'shirt', formality: 3, capsuleTags: ['Refined'] },
  pants: { id: '2', name: 'Navy Chinos', category: 'pants', formality: 3, capsuleTags: ['Refined'] },
  shoes: { id: '3', name: 'Brown Loafers', category: 'shoes', formality: 3, capsuleTags: ['Refined'] },
  belt: { id: '4', name: 'Brown Leather Belt', category: 'belt', formality: 3, capsuleTags: ['Refined'] },
  watch: { id: '5', name: 'Classic Watch', category: 'watch', formality: 3, capsuleTags: ['Refined'] },
  tuck: 'tucked',
  score: 92,
  source: 'generated' as const,
  loved: false,
};

export const EnhancedThemeDemo: React.FC = () => {
  const { theme, resolvedTheme, systemPreference } = useEnhancedTheme();

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 transition-colors duration-300">
      <div className="container mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200">
            Enhanced Theme & Responsive Design Demo
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Demonstrating React 19 & Tailwind 4 enhancements with system preference detection and container queries
          </p>
        </div>

        {/* Theme Controls */}
        <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200">Theme Controls</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <h3 className="font-medium text-slate-700 dark:text-slate-300">Simple Toggle</h3>
              <SimpleThemeToggle />
            </div>
            
            <div className="space-y-2">
              <h3 className="font-medium text-slate-700 dark:text-slate-300">Button with Label</h3>
              <EnhancedThemeToggle variant="button" showLabel={true} />
            </div>
            
            <div className="space-y-2">
              <h3 className="font-medium text-slate-700 dark:text-slate-300">Dropdown Selector</h3>
              <EnhancedThemeToggle variant="dropdown" showLabel={true} />
            </div>
          </div>

          <div className="mt-4 p-4 bg-white dark:bg-slate-700 rounded border">
            <h3 className="font-medium text-slate-700 dark:text-slate-300 mb-2">Theme Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium">Current Theme:</span> {theme}
              </div>
              <div>
                <span className="font-medium">Resolved Theme:</span> {resolvedTheme}
              </div>
              <div>
                <span className="font-medium">System Preference:</span> {systemPreference}
              </div>
            </div>
          </div>
        </div>

        {/* Responsive Cards Demo */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200">Responsive Cards with Container Queries</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Compact Card */}
            <div className="space-y-4">
              <h3 className="font-medium text-slate-700 dark:text-slate-300">Compact Card</h3>
              <div className="border border-gray-300 dark:border-slate-600 rounded-lg p-4">
                <ResponsiveOutfitCard
                  outfit={mockOutfit}
                  variant="compact"
                  showScore={true}
                  showSource={true}
                  enableFlip={true}
                />
              </div>
            </div>

            {/* Detailed Card */}
            <div className="space-y-4">
              <h3 className="font-medium text-slate-700 dark:text-slate-300">Detailed Card</h3>
              <div className="border border-gray-300 dark:border-slate-600 rounded-lg p-4">
                <ResponsiveOutfitCard
                  outfit={mockOutfit}
                  variant="detailed"
                  showScore={true}
                  enableFlip={true}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Container Query Demo */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200">Container Query Behavior</h2>
          <p className="text-slate-600 dark:text-slate-400">
            Resize the containers below to see how components adapt based on their container size, not viewport size.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Small Container */}
            <div className="space-y-2">
              <h3 className="font-medium text-slate-700 dark:text-slate-300">Small Container (300px)</h3>
              <div className="w-[300px] border border-gray-300 dark:border-slate-600 rounded-lg p-4">
                <ResponsiveOutfitCard
                  outfit={mockOutfit}
                  variant="compact"
                  showScore={true}
                />
              </div>
            </div>

            {/* Large Container */}
            <div className="space-y-2">
              <h3 className="font-medium text-slate-700 dark:text-slate-300">Large Container (500px)</h3>
              <div className="w-[500px] border border-gray-300 dark:border-slate-600 rounded-lg p-4">
                <ResponsiveOutfitCard
                  outfit={mockOutfit}
                  variant="compact"
                  showScore={true}
                />
              </div>
            </div>
          </div>
        </div>

        {/* CSS Custom Properties Demo */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200">CSS Custom Properties</h2>
          <p className="text-slate-600 dark:text-slate-400">
            The theme system uses CSS custom properties for consistent theming across all components.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="outfit-card p-4 rounded-lg border">
              <h3 className="font-medium mb-2">Surface Colors</h3>
              <div className="space-y-2 text-sm">
                <div className="p-2 rounded" style={{ backgroundColor: 'rgb(var(--color-surface))' }}>
                  Primary Surface
                </div>
                <div className="p-2 rounded" style={{ backgroundColor: 'rgb(var(--color-surface-secondary))' }}>
                  Secondary Surface
                </div>
              </div>
            </div>

            <div className="outfit-card p-4 rounded-lg border">
              <h3 className="font-medium mb-2">Text Colors</h3>
              <div className="space-y-2 text-sm">
                <div style={{ color: 'rgb(var(--color-text-primary))' }}>
                  Primary Text
                </div>
                <div style={{ color: 'rgb(var(--color-text-secondary))' }}>
                  Secondary Text
                </div>
              </div>
            </div>

            <div className="outfit-card p-4 rounded-lg border">
              <h3 className="font-medium mb-2">Border Colors</h3>
              <div className="space-y-2 text-sm">
                <div className="p-2 rounded border" style={{ borderColor: 'rgb(var(--color-border))' }}>
                  Primary Border
                </div>
                <div className="p-2 rounded border" style={{ borderColor: 'rgb(var(--color-border-secondary))' }}>
                  Secondary Border
                </div>
              </div>
            </div>

            <div className="outfit-card p-4 rounded-lg border">
              <h3 className="font-medium mb-2">Primary Colors</h3>
              <div className="space-y-2 text-sm">
                <div className="p-2 rounded text-white" style={{ backgroundColor: 'rgb(var(--color-primary-500))' }}>
                  Primary 500
                </div>
                <div className="p-2 rounded" style={{ backgroundColor: 'rgb(var(--color-primary-100))' }}>
                  Primary 100
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};