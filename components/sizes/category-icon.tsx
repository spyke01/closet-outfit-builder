import { Shirt, Ruler, Footprints, Briefcase, Minus } from 'lucide-react';

interface CategoryIconProps {
  iconName: string;
  className?: string;
}

/**
 * CategoryIcon Component
 * 
 * Maps category icon names to Lucide React icons.
 * Uses simple line-based icons that work well with the layout.
 */
export function CategoryIcon({ iconName, className = 'h-6 w-6' }: CategoryIconProps) {
  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    Shirt,
    Ruler,
    Footprints,
    Briefcase,
    Minus,
  };

  const IconComponent = iconMap[iconName];

  if (!IconComponent) {
    return null;
  }

  return <IconComponent className={className} aria-hidden="true" />;
}
