'use client';

import { Briefcase, Coffee, Shuffle, Sun, Snowflake, CloudSun } from 'lucide-react/dist/esm/icons';
import type { StyleBaseline } from '@/lib/types/onboarding';

interface StepStyleBaselineProps {
  value: StyleBaseline;
  onChange: (value: StyleBaseline) => void;
}

type PrimaryUse = 'Work' | 'Casual' | 'Mixed';
type Climate = 'Hot' | 'Cold' | 'Mixed';

const PRIMARY_USE_OPTIONS: Array<{
  value: PrimaryUse;
  label: string;
  description: string;
  icon: typeof Briefcase;
}> = [
  {
    value: 'Work',
    label: 'Work',
    description: 'Professional and business attire',
    icon: Briefcase,
  },
  {
    value: 'Casual',
    label: 'Casual',
    description: 'Everyday and relaxed clothing',
    icon: Coffee,
  },
  {
    value: 'Mixed',
    label: 'Mixed',
    description: 'Both work and casual wear',
    icon: Shuffle,
  },
];

const CLIMATE_OPTIONS: Array<{
  value: Climate;
  label: string;
  description: string;
  icon: typeof Sun;
}> = [
  {
    value: 'Hot',
    label: 'Hot',
    description: 'Warm weather, summer clothing',
    icon: Sun,
  },
  {
    value: 'Cold',
    label: 'Cold',
    description: 'Cool weather, winter clothing',
    icon: Snowflake,
  },
  {
    value: 'Mixed',
    label: 'Mixed',
    description: 'All seasons, varied weather',
    icon: CloudSun,
  },
];

export function StepStyleBaseline({ value, onChange }: StepStyleBaselineProps) {
  const handlePrimaryUseChange = (primaryUse: PrimaryUse) => {
    onChange({ ...value, primaryUse });
  };

  const handleClimateChange = (climate: Climate) => {
    onChange({ ...value, climate });
  };

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-2xl font-semibold mb-2 text-foreground">Tell us about your style</h2>
        <p className="text-muted-foreground">
          This helps us suggest relevant categories and items for your wardrobe.
        </p>
      </header>

      <div className="space-y-6">
        <fieldset>
          <legend className="block text-lg font-medium mb-4 text-foreground">
            What do you primarily wear?
          </legend>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {PRIMARY_USE_OPTIONS.map((option) => {
              const Icon = option.icon;
              const isSelected = value.primaryUse === option.value;
              
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handlePrimaryUseChange(option.value)}
                  className={`
                    flex flex-col items-center p-6 min-h-[120px] rounded-lg border-2 transition-all touch-manipulation
                    ${isSelected
                      ? 'border-blue-600 bg-blue-50 dark:border-blue-500 dark:bg-blue-950'
                      : 'border-gray-300 bg-white hover:border-gray-400 dark:border-gray-600 dark:bg-gray-800 dark:hover:border-gray-500'
                    }
                  `}
                  aria-pressed={isSelected}
                  aria-label={`${option.label}: ${option.description}${isSelected ? ' (selected)' : ''}`}
                >
                  <Icon className={`w-8 h-8 mb-3 ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'}`} aria-hidden="true" />
                  <span className={`font-semibold mb-1 ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-foreground'}`}>
                    {option.label}
                  </span>
                  <span className="text-sm text-center text-muted-foreground">
                    {option.description}
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset>
          <legend className="block text-lg font-medium mb-4 text-foreground">
            What climate do you dress for?
          </legend>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {CLIMATE_OPTIONS.map((option) => {
              const Icon = option.icon;
              const isSelected = value.climate === option.value;
              
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleClimateChange(option.value)}
                  className={`
                    flex flex-col items-center p-6 min-h-[120px] rounded-lg border-2 transition-all touch-manipulation
                    ${isSelected
                      ? 'border-blue-600 bg-blue-50 dark:border-blue-500 dark:bg-blue-950'
                      : 'border-gray-300 bg-white hover:border-gray-400 dark:border-gray-600 dark:bg-gray-800 dark:hover:border-gray-500'
                    }
                  `}
                  aria-pressed={isSelected}
                  aria-label={`${option.label}: ${option.description}${isSelected ? ' (selected)' : ''}`}
                >
                  <Icon className={`w-8 h-8 mb-3 ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'}`} aria-hidden="true" />
                  <span className={`font-semibold mb-1 ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-foreground'}`}>
                    {option.label}
                  </span>
                  <span className="text-sm text-center text-muted-foreground">
                    {option.description}
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>
      </div>

      {!value.primaryUse && !value.climate && (
        <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg dark:bg-amber-950 dark:border-amber-800" role="alert">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            Please select both your primary clothing use and climate to continue.
          </p>
        </div>
      )}
      {value.primaryUse && !value.climate && (
        <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg dark:bg-amber-950 dark:border-amber-800" role="alert">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            Please select your climate preference to continue.
          </p>
        </div>
      )}
      {!value.primaryUse && value.climate && (
        <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg dark:bg-amber-950 dark:border-amber-800" role="alert">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            Please select your primary clothing use to continue.
          </p>
        </div>
      )}
    </div>
  );
}
