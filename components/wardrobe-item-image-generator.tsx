'use client';

import { useState } from 'react';
import { Lock, Sparkles, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  useGenerateWardrobeItemImage,
  useImageGenerationQuota,
} from '@/lib/hooks/use-wardrobe-item-image-generation';

interface WardrobeItem {
  id: string;
  name: string;
  color?: string | null;
  category?: { name: string } | null;
  image_url?: string | null;
}

interface WardrobeItemImageGeneratorProps {
  item: WardrobeItem;
  onGenerated?: (imageUrl: string) => void;
}

function hasRequiredData(item: WardrobeItem): boolean {
  return Boolean(item.color && item.category);
}

export function WardrobeItemImageGenerator({
  item,
  onGenerated,
}: WardrobeItemImageGeneratorProps) {
  const { generate, isGenerating, error } = useGenerateWardrobeItemImage();
  const { limits, isLoading: quotaLoading, canGenerate, isFreeTier } = useImageGenerationQuota();
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [showReplaceConfirm, setShowReplaceConfirm] = useState(false);

  const itemHasData = hasRequiredData(item);
  const itemHasImage = Boolean(item.image_url);

  function handleGenerateClick() {
    if (isFreeTier) {
      setShowUpgradePrompt(true);
      return;
    }
    if (itemHasImage) {
      setShowReplaceConfirm(true);
      return;
    }
    triggerGeneration();
  }

  function triggerGeneration() {
    setShowReplaceConfirm(false);
    generate({ wardrobe_item_id: item.id }, {
      onSuccess: (imageUrl) => {
        if (onGenerated) onGenerated(imageUrl);
      },
    });
  }

  // Parse error_code from error message
  const errorCode = error
    ? ((error as Error & { error_code?: string }).error_code ?? '')
    : '';

  return (
    <div className="space-y-3">
      {/* Missing data warning */}
      {!itemHasData && (
        <Alert variant="info">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Add a{!item.color ? ' color' : ''}{!item.color && !item.category ? ' and' : ''}{!item.category ? ' category' : ''} to generate an AI image.
          </AlertDescription>
        </Alert>
      )}

      {/* Free tier locked state */}
      {isFreeTier && (
        <div className="space-y-2">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={!itemHasData}
            onClick={handleGenerateClick}
            aria-label="Generate image with AI (requires upgrade)"
          >
            <Lock className="mr-2 h-4 w-4" />
            Generate with AI
          </Button>
          {showUpgradePrompt && (
            <Alert variant="info">
              <AlertDescription>
                AI image generation is available on Plus and Pro plans.{' '}
                <a href="/pricing" className="underline font-medium">
                  Upgrade your plan
                </a>{' '}
                to unlock this feature.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Paid tier generate button */}
      {!isFreeTier && (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={isGenerating || !itemHasData || !canGenerate || quotaLoading}
          onClick={handleGenerateClick}
          aria-label={isGenerating ? 'Generating image...' : 'Generate image with AI'}
        >
          {isGenerating ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              <span aria-live="polite" role="status">Generating...</span>
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate with AI
            </>
          )}
        </Button>
      )}

      {/* Quota display */}
      {!isFreeTier && !quotaLoading && (
        <p className="text-xs text-muted-foreground text-center">
          {limits.monthly_remaining} of {limits.monthly_limit} image generations remaining this month
        </p>
      )}

      {/* Replace existing image confirmation */}
      {showReplaceConfirm && (
        <Alert variant="info">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="space-y-2">
            <p>This will replace the existing image for &quot;{item.name}&quot;. Continue?</p>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                onClick={triggerGeneration}
              >
                Generate
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setShowReplaceConfirm(false)}
              >
                Cancel
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Error messages */}
      {error && !isGenerating && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription aria-live="polite">
            {errorCode === 'USAGE_LIMIT_EXCEEDED' && (
              <>
                Monthly limit reached. Upgrade your plan or wait until{' '}
                {limits.monthly_reset_at
                  ? new Date(limits.monthly_reset_at).toLocaleDateString()
                  : 'next period'}
                .
              </>
            )}
            {errorCode === 'BURST_LIMIT_EXCEEDED' && (
              <>Hourly limit reached. Try again in an hour.</>
            )}
            {errorCode === 'MISSING_ITEM_DATA' && (
              <>Add a color and category to this item before generating an image.</>
            )}
            {!['USAGE_LIMIT_EXCEEDED', 'BURST_LIMIT_EXCEEDED', 'MISSING_ITEM_DATA'].includes(
              errorCode,
            ) && <>{error.message}</>}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
