import { useRef, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { generateWardrobeItemImage, getImageGenerationQuota } from '@/lib/actions/wardrobe-item-images';
import { queryKeys } from '@/lib/query-client';
import type { PlanCode } from '@/lib/services/billing/plans';
import { isFreePlan } from '@/lib/services/billing/plan-labels';

const DEBOUNCE_MS = 3000;

interface GenerateParams {
  wardrobe_item_id: string;
  is_retry?: boolean;
}

interface GenerateOptions {
  onSuccess?: (imageUrl: string) => void;
}

export interface UseGenerateWardrobeItemImageReturn {
  generate: (params: GenerateParams, options?: GenerateOptions) => void;
  generateAsync: (params: GenerateParams) => Promise<string>;
  isGenerating: boolean;
  error: Error | null;
}

export function useGenerateWardrobeItemImage(): UseGenerateWardrobeItemImageReturn {
  const queryClient = useQueryClient();
  const lastCallRef = useRef<number>(0);

  const mutation = useMutation({
    mutationFn: async (params: GenerateParams) => {
      const result = await generateWardrobeItemImage({
        wardrobe_item_id: params.wardrobe_item_id,
        is_retry: params.is_retry ?? false,
      });

      if (!result.success) {
        throw new Error(
          `${result.error}|${result.error_code}`,
        );
      }

      return result;
    },
    onSuccess: (_data, params) => {
      // Invalidate wardrobe item queries so the new image_url is fetched
      queryClient.invalidateQueries({ queryKey: queryKeys.wardrobe.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.wardrobe.item(params.wardrobe_item_id),
      });
      // Also invalidate quota so it reflects the updated count
      queryClient.invalidateQueries({ queryKey: ['image-generation-quota'] });
    },
  });

  const generate = useCallback(
    (params: GenerateParams, options?: GenerateOptions) => {
      const now = Date.now();
      if (now - lastCallRef.current < DEBOUNCE_MS) {
        return;
      }
      lastCallRef.current = now;
      mutation.mutate(params, {
        onSuccess: (data) => {
          if (data.image_url && options?.onSuccess) {
            options.onSuccess(data.image_url);
          }
        },
      });
    },
    [mutation],
  );

  const generateAsync = useCallback(
    async (params: GenerateParams): Promise<string> => {
      const result = await mutation.mutateAsync(params);
      return result.image_url;
    },
    [mutation],
  );

  // Parse error message into Error with error_code attached
  let parsedError: Error | null = null;
  if (mutation.error) {
    const raw = mutation.error instanceof Error ? mutation.error.message : String(mutation.error);
    const [message, code] = raw.split('|');
    const err = new Error(message);
    (err as Error & { error_code?: string }).error_code = code;
    parsedError = err;
  }

  return {
    generate,
    generateAsync,
    isGenerating: mutation.isPending,
    error: parsedError,
  };
}

export interface UseImageGenerationQuotaReturn {
  tier: PlanCode;
  limits: {
    monthly_limit: number;
    monthly_remaining: number;
    monthly_reset_at: string;
    hourly_limit: number;
    hourly_remaining: number;
  };
  isLoading: boolean;
  canGenerate: boolean;
  isFreeTier: boolean;
}

const defaultLimits = {
  monthly_limit: 0,
  monthly_remaining: 0,
  monthly_reset_at: '',
  hourly_limit: 5,
  hourly_remaining: 0,
};

export function useImageGenerationQuota(): UseImageGenerationQuotaReturn {
  const { data, isLoading } = useQuery({
    queryKey: ['image-generation-quota'],
    queryFn: async () => {
      const result = await getImageGenerationQuota();
      if (!result.success) throw new Error(result.error);
      return result;
    },
    staleTime: 60 * 1000, // 1 minute
  });

  const tier = (data?.tier ?? 'free') as PlanCode;
  const limits = data?.limits ?? defaultLimits;
  const isFreeTier = isFreePlan(tier);
  const canGenerate = !isFreeTier && limits.monthly_remaining > 0 && limits.hourly_remaining > 0;

  return {
    tier,
    limits,
    isLoading,
    canGenerate,
    isFreeTier,
  };
}
