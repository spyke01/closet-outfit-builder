import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';

// Mock dependencies
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/utils/error-logging', () => ({
  logError: vi.fn(() => 'test-error-id'),
}));

vi.mock('@/lib/middleware/security-middleware', () => ({
  withSecurity: vi.fn((config) => (handler) => handler),
  SecurityConfigs: {
    authenticated: {},
  },
}));

import { createClient } from '@/lib/supabase/server';
import { logError } from '@/lib/utils/error-logging';

describe('Seed Categories API Route', () => {
  let mockSupabase: any;
  let mockRpc: any;
  let mockFrom: any;
  let mockSelect: any;
  let mockEq: any;
  let mockOrder: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock chain for Supabase queries
    mockOrder = vi.fn().mockResolvedValue({ data: [], error: null });
    mockEq = vi.fn().mockReturnValue({ order: mockOrder });
    mockSelect = vi.fn().mockReturnValue({ 
      eq: vi.fn().mockReturnValue({ 
        eq: mockEq 
      }) 
    });
    mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
    mockRpc = vi.fn().mockResolvedValue({ error: null });

    mockSupabase = {
      rpc: mockRpc,
      from: mockFrom,
    };

    (createClient as any).mockResolvedValue(mockSupabase);
  });

  describe('POST /api/sizes/seed-categories', () => {
    it('should return 401 if user is not authenticated', async () => {
      // Import the handler directly for testing
      const { POST } = await import('../route');
      
      const mockRequest = {
        user: null,
      } as any;

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
    });

    it('should successfully seed categories for authenticated user', async () => {
      const { POST } = await import('../route');

      const mockCategories = [
        {
          id: 'cat-1',
          user_id: 'user-123',
          name: 'Dress Shirt',
          icon: 'shirt',
          gender: 'men',
          is_system_category: true,
        },
        {
          id: 'cat-2',
          user_id: 'user-123',
          name: 'Casual Shirt',
          icon: 'shirt',
          gender: 'men',
          is_system_category: true,
        },
      ];

      mockOrder.mockResolvedValue({ data: mockCategories, error: null });

      const mockRequest = {
        user: { id: 'user-123' },
      } as any;

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Categories seeded successfully');
      expect(data.data).toEqual(mockCategories);
      expect(data.count).toBe(2);
      expect(mockRpc).toHaveBeenCalledWith('seed_system_categories', {
        p_user_id: 'user-123',
      });
    });

    it('should handle database errors during seeding', async () => {
      const { POST } = await import('../route');

      const seedError = new Error('Database connection failed');
      mockRpc.mockResolvedValue({ error: seedError });

      const mockRequest = {
        user: { id: 'user-123' },
      } as any;

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to seed categories');
      expect(logError).toHaveBeenCalledWith(
        seedError,
        'database',
        'high',
        expect.objectContaining({
          userId: 'user-123',
          component: 'seed-categories-api',
          action: 'seed_system_categories',
        })
      );
    });

    it('should handle errors during category fetch but still return success', async () => {
      const { POST } = await import('../route');

      const fetchError = new Error('Fetch failed');
      mockOrder.mockResolvedValue({ data: null, error: fetchError });

      const mockRequest = {
        user: { id: 'user-123' },
      } as any;

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Categories seeded successfully');
      expect(data.data).toEqual([]);
      expect(logError).toHaveBeenCalledWith(
        fetchError,
        'database',
        'medium',
        expect.objectContaining({
          userId: 'user-123',
          component: 'seed-categories-api',
          action: 'fetch_seeded_categories',
        })
      );
    });

    it('should be idempotent - safe to call multiple times', async () => {
      const { POST } = await import('../route');

      const mockCategories = [
        {
          id: 'cat-1',
          user_id: 'user-123',
          name: 'Dress Shirt',
          icon: 'shirt',
          gender: 'men',
          is_system_category: true,
        },
      ];

      mockOrder.mockResolvedValue({ data: mockCategories, error: null });

      const mockRequest = {
        user: { id: 'user-123' },
      } as any;

      // Call twice
      const response1 = await POST(mockRequest);
      const data1 = await response1.json();

      const response2 = await POST(mockRequest);
      const data2 = await response2.json();

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      expect(data1.success).toBe(true);
      expect(data2.success).toBe(true);
      expect(mockRpc).toHaveBeenCalledTimes(2);
    });

    it('should handle unexpected errors gracefully', async () => {
      const { POST } = await import('../route');

      // Force an unexpected error
      mockRpc.mockRejectedValue(new Error('Unexpected error'));

      const mockRequest = {
        user: { id: 'user-123' },
      } as any;

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
      expect(data.errorId).toBe('test-error-id');
      expect(logError).toHaveBeenCalled();
    });
  });
});
