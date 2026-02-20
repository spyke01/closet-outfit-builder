import { beforeEach, describe, expect, it, vi } from 'vitest';
import { persistWardrobeItems } from '../onboarding-persister';
import type { GeneratedWardrobeItem } from '@/lib/types/onboarding';
import type { CategoryKey } from '@/lib/data/onboarding-categories';

const insertMock = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: () => ({
      insert: insertMock,
    }),
  }),
}));

describe('persistWardrobeItems', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertMock.mockReturnValue({
      select: vi.fn().mockResolvedValue({
        data: [{ id: 'new-item-id' }],
        error: null,
      }),
    });
  });

  it('inserts onboarding items with user_id and active=true', async () => {
    const items: GeneratedWardrobeItem[] = [
      {
        id: 'tmp-1',
        category: 'Tops' as const,
        subcategory: 'T-Shirt',
        name: 'Navy T-Shirt',
        color: 'navy',
        formality_score: 3,
        season: ['All'],
        image_url: null,
        source: 'onboarding' as const,
      },
    ];
    const categoryMap = new Map<CategoryKey, string>([['Tops', 'cat-1']]);

    const result = await persistWardrobeItems('user-1', items, categoryMap);

    expect(result.success).toBe(1);
    expect(result.failed).toBe(0);
    expect(insertMock).toHaveBeenCalledTimes(1);
    expect(insertMock).toHaveBeenCalledWith([
      expect.objectContaining({
        user_id: 'user-1',
        category_id: 'cat-1',
        name: 'Navy T-Shirt',
        active: true,
        capsule_tags: ['onboarding'],
      }),
    ]);
  });
});
