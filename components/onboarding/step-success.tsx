'use client';

import { useRouter } from 'next/navigation';
import { PartyPopper } from 'lucide-react/dist/esm/icons';
import { AIIcon } from '@/components/ai-icon';

interface StepSuccessProps {
  totalItems: number;
  onViewWardrobe?: () => void;
  onGenerateOutfits?: () => void;
}

export function StepSuccess({
  totalItems,
  onViewWardrobe,
  onGenerateOutfits,
}: StepSuccessProps) {
  const router = useRouter();

  const handleViewWardrobe = () => {
    if (onViewWardrobe) {
      onViewWardrobe();
    } else {
      router.push('/wardrobe');
    }
  };

  const handleGenerateOutfits = () => {
    if (onGenerateOutfits) {
      onGenerateOutfits();
    } else {
      router.push('/today');
    }
  };

  return (
    <section className="flex flex-col items-center justify-center py-12 space-y-8" aria-labelledby="success-heading">
      <div className="flex items-center justify-center w-24 h-24 rounded-full bg-green-100 dark:bg-green-900" role="img" aria-label="Success celebration">
        <PartyPopper className="w-12 h-12 text-green-600 dark:text-green-400" aria-hidden="true" />
      </div>

      <header className="text-center space-y-4">
        <h2 id="success-heading" className="text-3xl font-bold text-foreground">
          Your wardrobe is ready!
        </h2>
        <p className="text-lg text-muted-foreground">
          Successfully created {totalItems} {totalItems === 1 ? 'item' : 'items'} in your wardrobe.
        </p>
      </header>

      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
        <button
          type="button"
          onClick={handleViewWardrobe}
          className="flex-1 px-6 py-3 min-h-[44px] bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-colors focus:ring-2 focus:ring-ring focus:ring-offset-2 touch-manipulation"
          aria-label="View your wardrobe"
        >
          View My Wardrobe
        </button>
        <button
          type="button"
          onClick={handleGenerateOutfits}
          className="flex-1 px-6 py-3 min-h-[44px] border-2 border-primary text-primary rounded-lg font-semibold hover:bg-muted transition-colors focus:ring-2 focus:ring-ring focus:ring-offset-2 touch-manipulation inline-flex items-center justify-center gap-2"
          aria-label="Generate outfit recommendations"
        >
          <AIIcon className="w-4 h-4" />
          Generate Outfits
        </button>
      </div>

      <div className="text-center space-y-2 mt-8">
        <p className="text-sm text-muted-foreground">
          You can always add more items or edit existing ones from your wardrobe page.
        </p>
      </div>
    </section>
  );
}
