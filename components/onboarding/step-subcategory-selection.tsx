'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Shirt, Layers, Footprints, Layers2, Sparkles, Watch } from 'lucide-react/dist/esm/icons';
import { Icon, type IconNode } from 'lucide-react';
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
import { getCategoryByKey, type CategoryKey } from '@/lib/data/onboarding-categories';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Icon mapping for categories (from main lucide-react)
const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Shirt,
  Layers,
  Footprints,
  Layers2,
  Sparkles,
  Watch,
};

// Icon mapping for subcategories (from @lucide/lab)
const SUBCATEGORY_ICON_NODES: Record<string, IconNode> = {
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

interface StepSubcategorySelectionProps {
  selectedCategories: CategoryKey[];
  selectedSubcategories: Partial<Record<CategoryKey, string[]>>;
  onChange: (subcategories: Partial<Record<CategoryKey, string[]>>) => void;
}

export function StepSubcategorySelection({
  selectedCategories,
  selectedSubcategories,
  onChange,
}: StepSubcategorySelectionProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<CategoryKey>>(
    new Set(selectedCategories)
  );

  const toggleCategory = (categoryKey: CategoryKey) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryKey)) {
      newExpanded.delete(categoryKey);
    } else {
      newExpanded.add(categoryKey);
    }
    setExpandedCategories(newExpanded);
  };

  const handleToggleSubcategory = (categoryKey: CategoryKey, subcategoryName: string) => {
    const currentSubcategories = selectedSubcategories[categoryKey] || [];
    const newSubcategories = currentSubcategories.includes(subcategoryName)
      ? currentSubcategories.filter(name => name !== subcategoryName)
      : [...currentSubcategories, subcategoryName];

    onChange({
      ...selectedSubcategories,
      [categoryKey]: newSubcategories,
    });
  };

  const handleSelectAll = (categoryKey: CategoryKey) => {
    const category = getCategoryByKey(categoryKey);
    if (!category) return;

    onChange({
      ...selectedSubcategories,
      [categoryKey]: category.subcategories.map(sub => sub.name),
    });
  };

  const handleSelectNone = (categoryKey: CategoryKey) => {
    onChange({
      ...selectedSubcategories,
      [categoryKey]: [],
    });
  };

  const totalSelected = Object.values(selectedSubcategories).reduce(
    (sum, subs) => sum + subs.length,
    0
  );

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-2xl font-semibold mb-2 text-foreground">Choose your items</h2>
        <p className="text-muted-foreground">
          Select the specific types of clothing you own within each category.
        </p>
      </header>

      <div className="space-y-4">
        {selectedCategories.map((categoryKey) => {
          const category = getCategoryByKey(categoryKey);
          if (!category) return null;

          const isExpanded = expandedCategories.has(categoryKey);
          const categorySubcategories = selectedSubcategories[categoryKey] || [];
          const selectedCount = categorySubcategories.length;
          const IconComponent = CATEGORY_ICONS[category.icon];

          return (
            <div
              key={categoryKey}
              className="border border-border rounded-lg overflow-hidden"
            >
              <button
                type="button"
                onClick={() => toggleCategory(categoryKey)}
                className="w-full flex items-center justify-between p-4 min-h-[56px] bg-muted hover:bg-card transition-colors touch-manipulation"
                aria-expanded={isExpanded}
                aria-controls={`category-${categoryKey}`}
                aria-label={`${category.name} category${selectedCount > 0 ? `, ${selectedCount} items selected` : ''}`}
              >
                <div className="flex items-center gap-3">
                  {IconComponent && (
                    <IconComponent className="w-5 h-5 text-muted-foreground" aria-hidden="true" />
                  )}
                  <span className="text-lg font-semibold text-foreground">{category.name}</span>
                  {selectedCount > 0 && (
                    <span className="text-sm px-2 py-1 rounded bg-secondary/20 text-secondary">
                      {selectedCount} selected
                    </span>
                  )}
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-muted-foreground" aria-hidden="true" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-muted-foreground" aria-hidden="true" />
                )}
              </button>

              {isExpanded && (
                <div id={`category-${categoryKey}`} className="p-4 bg-card">
                  <div className="flex gap-2 mb-4">
                    <button
                      type="button"
                      onClick={() => handleSelectAll(categoryKey)}
                      className="text-sm px-3 py-2 min-h-[44px] rounded border border-border hover:bg-muted transition-colors touch-manipulation"
                      aria-label={`Select all ${category.name} items`}
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectNone(categoryKey)}
                      className="text-sm px-3 py-2 min-h-[44px] rounded border border-border hover:bg-muted transition-colors touch-manipulation"
                      aria-label={`Deselect all ${category.name} items`}
                    >
                      Select None
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {category.subcategories.map((subcategory) => {
                      const isSelected = categorySubcategories.includes(subcategory.name);
                      const iconNode = SUBCATEGORY_ICON_NODES[subcategory.icon];
                      const MainIcon = MAIN_LUCIDE_ICONS[subcategory.icon];

                      return (
                        <label
                          key={subcategory.name}
                          className={`
                            flex items-center gap-2 p-3 min-h-[44px] rounded-lg border-2 cursor-pointer transition-all touch-manipulation
                            ${isSelected
                              ? 'border-primary bg-primary/10'
                              : 'border-border hover:border-secondary'
                            }
                          `}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSubcategory(categoryKey, subcategory.name)}
                            className="sr-only"
                            aria-label={`${subcategory.name}${isSelected ? ' (selected)' : ''}`}
                          />
                          {iconNode ? (
                            <Icon 
                              iconNode={iconNode}
                              className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}
                              aria-hidden="true"
                            />
                          ) : MainIcon ? (
                            <MainIcon 
                              className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}
                              aria-hidden="true"
                            />
                          ) : null}
                          <span className={`text-sm ${isSelected ? 'text-primary font-medium' : 'text-foreground'}`}>
                            {subcategory.name}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {totalSelected === 0 && (
        <Alert variant="warning">
          <AlertDescription>
            Please select at least one subcategory to continue. Expand a category above and check the items you own.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
