import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createWardrobeItem, updateWardrobeItem, deleteWardrobeItem } from '../wardrobe';
import * as auth from '../auth';

// Mock dependencies
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('../auth', () => ({
  verifySession: vi.fn(),
  verifyOwnership: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('Wardrobe Server Actions', () => {
  const mockUser = { id: 'user-123', email: 'test@example.com' };
  const mockSupabase = {
    from: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth.verifySession).mockResolvedValue(mockUser);
    vi.mocked(auth.verifyOwnership).mockResolvedValue(undefined);
  });

  describe('createWardrobeItem', () => {
    it('should create wardrobe item with authentication', async () => {
      const mockItem = { id: 'item-123', name: 'Blue Jacket', user_id: mockUser.id };
      
      const mockChain = {
        data: mockItem,
        error: null,
      };

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue(mockChain),
        }),
      });

      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
      });

      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

      const result = await createWardrobeItem({
        name: 'Blue Jacket',
        category_id: '550e8400-e29b-41d4-a716-446655440000', // Valid UUID
      });

      expect(auth.verifySession).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockItem);
    });

    it('should return error for unauthenticated user', async () => {
      vi.mocked(auth.verifySession).mockRejectedValue(new Error('Unauthorized: Authentication required'));

      const result = await createWardrobeItem({
        name: 'Blue Jacket',
        category_id: 'cat-123',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unauthorized');
    });

    it('should validate input data', async () => {
      const result = await createWardrobeItem({
        name: '', // Invalid: empty name
        category_id: 'invalid-uuid', // Invalid: not a UUID
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Validation failed');
    });
  });

  describe('updateWardrobeItem', () => {
    it('should update wardrobe item with ownership verification', async () => {
      const itemId = '550e8400-e29b-41d4-a716-446655440000';
      const mockUpdatedItem = { id: itemId, name: 'Updated Jacket', user_id: mockUser.id };
      
      const mockSelectChain = {
        data: { user_id: mockUser.id },
        error: null,
      };

      const mockUpdateChain = {
        data: mockUpdatedItem,
        error: null,
      };

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue(mockSelectChain),
        }),
      });

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue(mockUpdateChain),
            }),
          }),
        }),
      });

      mockSupabase.from.mockReturnValueOnce({
        select: mockSelect,
      }).mockReturnValueOnce({
        update: mockUpdate,
      });

      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

      const result = await updateWardrobeItem({
        id: itemId,
        name: 'Updated Jacket',
      });

      expect(auth.verifySession).toHaveBeenCalled();
      expect(auth.verifyOwnership).toHaveBeenCalledWith(mockUser.id, mockUser.id);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUpdatedItem);
    });

    it('should reject update for non-owner', async () => {
      const itemId = '550e8400-e29b-41d4-a716-446655440111';
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { user_id: 'other-user' },
            error: null,
          }),
        }),
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });

      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

      vi.mocked(auth.verifyOwnership).mockRejectedValue(
        new Error('Forbidden: You do not have permission to access this resource')
      );

      const result = await updateWardrobeItem({
        id: itemId,
        name: 'Updated Jacket',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Forbidden');
    });
  });

  describe('deleteWardrobeItem', () => {
    it('should soft delete wardrobe item with ownership verification', async () => {
      const itemId = '550e8400-e29b-41d4-a716-446655440222';
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { user_id: mockUser.id },
            error: null,
          }),
        }),
      });

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            error: null,
          }),
        }),
      });

      mockSupabase.from.mockReturnValueOnce({
        select: mockSelect,
      }).mockReturnValueOnce({
        update: mockUpdate,
      });

      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

      const result = await deleteWardrobeItem({
        id: itemId,
      });

      expect(auth.verifySession).toHaveBeenCalled();
      expect(auth.verifyOwnership).toHaveBeenCalledWith(mockUser.id, mockUser.id);
      expect(result.success).toBe(true);
      expect(mockUpdate).toHaveBeenCalledWith({ active: false });
    });
  });
});
