import '@testing-library/jest-dom';
import { beforeEach, vi } from 'vitest';

// Create a chainable mock for Supabase client
const createChainableMock = () => {
  const mock = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn(),
    mockResolvedValue: vi.fn().mockReturnThis(),
  };
  
  // Make all methods return the mock itself for chaining
  Object.keys(mock).forEach((key: string) => {
    if (key !== 'single' && key !== 'mockResolvedValue') {
      (mock as any)[key].mockReturnValue(mock);
    }
  });
  
  return mock;
};

// Mock Supabase client
const mockSupabaseClient = {
  from: vi.fn(() => createChainableMock()),
  functions: {
    invoke: vi.fn(),
  },
  auth: {
    getUser: vi.fn(),
    getSession: vi.fn(),
  },
};

// Mock the Supabase client creation
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabaseClient,
}));

// Mock getCurrentUserId function in all hook files
const mockUserId = 'test-user-id';
vi.mock('@/lib/hooks/use-wardrobe-items', async () => {
  const actual = await vi.importActual('@/lib/hooks/use-wardrobe-items');
  return {
    ...actual,
    getCurrentUserId: () => mockUserId,
  };
});

vi.mock('@/lib/hooks/use-outfits', async () => {
  const actual = await vi.importActual('@/lib/hooks/use-outfits');
  return {
    ...actual,
    getCurrentUserId: () => mockUserId,
  };
});

vi.mock('@/lib/hooks/use-categories', async () => {
  const actual = await vi.importActual('@/lib/hooks/use-categories');
  return {
    ...actual,
    getCurrentUserId: () => mockUserId,
  };
});

// Mock Next.js environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'test-key';

// Reset all mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});

// Export the mock for use in tests
export { mockSupabaseClient };