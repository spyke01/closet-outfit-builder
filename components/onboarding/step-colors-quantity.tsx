'use client';

import { Watch, Footprints } from 'lucide-react/dist/esm/icons';
import { Icon } from 'lucide-react';
import { 
  shirtT, 
  shirtFoldedButtons, 
  shirtLongSleeve, 
  shirtTVNeck, 
  sweater, 
  trousers, 
  skirt, 
  jacketSports, 
  jacket, 
  dress, 
  belt, 
  tie, 
  scarf 
} from '@lucide/lab';
import { getCategoryByKey, getSubcategory, type CategoryKey } from '@/lib/data/onboarding-categories';
import { COLOR_OPTIONS } from '@/lib/data/color-options';
import type { SubcategoryColorSelection } from '@/lib/types/onboarding';

// Icon mapping for subcategories (from @lucide/lab and lucide-react)
const SUBCATEGORY_ICON_NODES: Record<string, any> = {
  shirtT,
  shirtFoldedButtons,
  shirtLongSleeve,
  shirtTVNeck,
  sweater,
  trousers,
  skirt,
  jacketSports,
  jacket,
  dress,
  belt,
  tie,
  scarf,
};

// For icons from main Lucide (Footprints, Watch), we need to handle them differently
const MAIN_LUCIDE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Footprints,
  Watch,
};

interface StepColorsQuantityProps {
  selectedCategories: CategoryKey[];
  selectedSubcategories: Record<CategoryKey, string[]>;
  colorQuantitySelections: Record<string, SubcategoryColorSelection>;
  onChange: (selections: Record<string, SubcategoryColorSelection>) => void;
}

export function StepColorsQuantity({
  selectedCategories,
  selectedSubcategories,
  colorQuantitySelections,
  onChange,
}: StepColorsQuantityProps) {
  const handleColorToggle = (categoryKey: CategoryKey, subcategory: string, color: string) => {
    const selectionKey = `${categoryKey}-${subcategory}`;
    const current = colorQuantitySelections[selectionKey] || {
      subcategory,
      colors: [],
    };

    const newColors = current.colors.includes(color)
      ? current.colors.filter(c => c !== color)
      : [...current.colors, color];

    onChange({
      ...colorQuantitySelections,
      [selectionKey]: {
        ...current,
        colors: newColors,
      },
    });
  };

  // Get all subcategories across selected categories
  const allSubcategories: Array<{ categoryKey: CategoryKey; subcategory: string }> = [];
  selectedCategories.forEach((categoryKey) => {
    const subs = selectedSubcategories[categoryKey] || [];
    subs.forEach((subcategory) => {
      allSubcategories.push({ categoryKey, subcategory });
    });
  });

  const hasValidSelection = Object.values(colorQuantitySelections).some(
    (selection) => selection.colors.length > 0
  );

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-2xl font-semibold mb-2 text-foreground">Select colors</h2>
        <p className="text-muted-foreground">
          For each item type, select the colors you own. We'll create one item per color.
        </p>
      </header>

      <div className="space-y-6">
        {allSubcategories.map(({ categoryKey, subcategory }) => {
          const category = getCategoryByKey(categoryKey);
          const subcategoryData = getSubcategory(categoryKey, subcategory);
          const selectionKey = `${categoryKey}-${subcategory}`;
          const selection = colorQuantitySelections[selectionKey] || {
            subcategory,
            colors: [],
          };
          const iconNode = SUBCATEGORY_ICON_NODES[subcategoryData?.icon || ''];
          const MainIcon = MAIN_LUCIDE_ICONS[subcategoryData?.icon || ''];

          return (
            <div
              key={`${categoryKey}-${subcategory}`}
              className="p-6 border border-gray-300 rounded-lg dark:border-gray-600"
            >
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-1">
                  {iconNode ? (
                    <Icon 
                      iconNode={iconNode}
                      className="w-5 h-5 text-gray-600 dark:text-gray-400" 
                      aria-hidden="true" 
                    />
                  ) : MainIcon ? (
                    <MainIcon 
                      className="w-5 h-5 text-gray-600 dark:text-gray-400" 
                      aria-hidden="true" 
                    />
                  ) : null}
                  <h3 className="text-lg font-semibold text-foreground">{subcategory}</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  {category?.name} • {selection.colors.length} color{selection.colors.length !== 1 ? 's' : ''} selected
                </p>
              </div>

              <fieldset>
                <legend className="sr-only">Select colors for {subcategory}</legend>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5">
                {COLOR_OPTIONS.filter(opt => opt.value !== '').map((colorOption) => {
                  const isSelected = selection.colors.includes(colorOption.value);

                  return (
                    <button
                      key={colorOption.value}
                      type="button"
                      onClick={() => handleColorToggle(categoryKey, subcategory, colorOption.value)}
                      className={`
                        flex items-center gap-2 p-2 min-h-[44px] rounded-md border transition-all text-left touch-manipulation
                        ${isSelected
                          ? 'border-blue-600 bg-blue-50 dark:border-blue-500 dark:bg-blue-950'
                          : 'border-gray-300 hover:border-gray-400 dark:border-gray-600 dark:hover:border-gray-500'
                        }
                      `}
                      aria-label={`${colorOption.label}${isSelected ? ' (selected)' : ''}`}
                      aria-pressed={isSelected}
                    >
                      <div
                        className="w-6 h-6 rounded-full border border-gray-300 dark:border-gray-600 flex-shrink-0"
                        style={{
                          backgroundColor: colorOption.hex || '#ccc',
                          ...(colorOption.value === 'white' && {
                            boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.1)',
                          }),
                        }}
                        aria-hidden="true"
                      />
                      <span className="text-xs font-medium text-foreground flex-1 truncate">
                        {colorOption.label}
                      </span>
                      {isSelected && (
                        <div className="w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                          <svg
                            className="w-2.5 h-2.5 text-white"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </fieldset>
            </div>
          );
        })}
      </div>

      {!hasValidSelection && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg dark:bg-amber-950 dark:border-amber-800" role="alert">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            Please select at least one color for at least one item type to continue.
          </p>
        </div>
      )}
    </div>
  );
}
