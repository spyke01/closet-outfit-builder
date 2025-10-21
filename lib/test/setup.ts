import '@testing-library/jest-dom';
import { beforeEach, vi } from 'vitest';

// Create a chainable mock for Supabase client that properly implements promises
const createChainableMock = () => {
  // Create a promise-like object that can be chained
  const createPromiseMock = (defaultData: any = []) => {
    const promiseMock = Promise.resolve({ data: defaultData, error: null });
    
    // Add chainable methods to the promise
    (promiseMock as any).select = vi.fn(() => createPromiseMock(defaultData));
    (promiseMock as any).insert = vi.fn(() => createPromiseMock(defaultData));
    (promiseMock as any).update = vi.fn(() => createPromiseMock(defaultData));
    (promiseMock as any).delete = vi.fn(() => createPromiseMock(defaultData));
    (promiseMock as any).eq = vi.fn(() => createPromiseMock(defaultData));
    (promiseMock as any).order = vi.fn(() => createPromiseMock(defaultData));
    (promiseMock as any).limit = vi.fn(() => createPromiseMock(defaultData));
    (promiseMock as any).single = vi.fn(() => Promise.resolve({ data: defaultData[0] || null, error: null }));
    
    return promiseMock;
  };
  
  return createPromiseMock();
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
    onAuthStateChange: vi.fn(() => ({
      data: { subscription: { unsubscribe: vi.fn() } }
    })),
    signOut: vi.fn(),
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
  },
};

// Mock the Supabase client creation
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabaseClient,
}));

// Mock the useAuth hook
vi.mock('@/lib/hooks/use-auth', () => ({
  useAuth: () => ({
    user: { id: mockUserId, email: 'test@example.com' },
    userId: mockUserId,
    isAuthenticated: true,
    isLoading: false,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
  }),
}));

// Mock geolocation API
const mockGeolocation = {
  getCurrentPosition: vi.fn(),
  watchPosition: vi.fn(),
  clearWatch: vi.fn(),
};

Object.defineProperty(global.navigator, 'geolocation', {
  value: mockGeolocation,
  writable: true,
});

// Mock fetch globally
global.fetch = vi.fn();

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