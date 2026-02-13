'use client';

import { Shirt, Layers, Footprints, Layers2, Sparkles, Watch } from 'lucide-react/dist/esm/icons';
import { ONBOARDING_CATEGORIES, type CategoryKey } from '@/lib/data/onboarding-categories';

interface StepCategoryOwnershipProps {
  selectedCategories: CategoryKey[];
  onChange: (categories: CategoryKey[]) => void;
}

const ICON_MAP = {
  Shirt,
  Layers,
  Footprints,
  Layers2,
  Sparkles,
  Watch,
};

export function StepCategoryOwnership({ selectedCategories, onChange }: StepCategoryOwnershipProps) {
  const handleToggleCategory = (categoryKey: CategoryKey) => {
    if (selectedCategories.includes(categoryKey)) {
      onChange(selectedCategories.filter(key => key !== categoryKey));
    } else {
      onChange([...selectedCategories, categoryKey]);
    }
  };

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-2xl font-semibold mb-2 text-foreground">What do you own?</h2>
        <p className="text-muted-foreground">
          Select the clothing categories you have in your wardrobe. Essential categories are pre-selected.
        </p>
      </header>

      <fieldset>
        <legend className="sr-only">Select clothing categories</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {ONBOARDING_CATEGORIES.map((category) => {
          const Icon = ICON_MAP[category.icon as keyof typeof ICON_MAP];
          const isSelected = selectedCategories.includes(category.key);
          const isEssential = category.isEssential;

          return (
            <button
              key={category.key}
              type="button"
              onClick={() => handleToggleCategory(category.key)}
              className={`
                relative flex flex-col items-start p-6 min-h-[120px] rounded-lg border-2 transition-all text-left touch-manipulation
                ${isSelected
                  ? 'border-blue-600 bg-blue-50 dark:border-blue-500 dark:bg-blue-950'
                  : 'border-gray-300 bg-white hover:border-gray-400 dark:border-gray-600 dark:bg-gray-800 dark:hover:border-gray-500'
                }
              `}
              role="checkbox"
              aria-checked={isSelected}
              aria-label={`${category.name}: ${category.description}${isEssential ? ' (essential category)' : ''}${isSelected ? ' (selected)' : ''}`}
            >
              {isEssential && (
                <span className="absolute top-2 right-2 text-xs font-semibold px-2 py-1 rounded bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                  Essential
                </span>
              )}
              
              <div className="flex items-center mb-3">
                <Icon className={`w-8 h-8 mr-3 ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'}`} aria-hidden="true" />
                <span className={`text-lg font-semibold ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-foreground'}`}>
                  {category.name}
                </span>
              </div>
              
              <p className="text-sm text-muted-foreground">
                {category.description}
              </p>
            </button>
          );
        })}
      </div>
    </fieldset>

      {selectedCategories.length === 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg dark:bg-amber-950 dark:border-amber-800" role="alert">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            Please select at least one category to continue. Essential categories (Tops, Bottoms, Shoes) are recommended for a complete wardrobe.
          </p>
        </div>
      )}
    </div>
  );
}
