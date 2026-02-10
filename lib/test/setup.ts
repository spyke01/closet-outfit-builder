import '@testing-library/jest-dom';
import { createElement } from 'react';
import { beforeEach, vi } from 'vitest';

const originalConsoleError = console.error.bind(console);
const originalConsoleWarn = console.warn.bind(console);

const isExpectedTestNoise = (message: string) => {
  const patterns = [
    'Not implemented: navigation to another Document',
    'Failed to read offline queue:',
    'Invalid outfit for score breakdown:',
    'Invalid item in ',
    'Failed to preload module for feature weather:',
    'Failed to load component for feature weather:',
    'not wrapped in act(...)',
    'Encountered two children with the same key',
    'Weather API error:',
    'No API key found in environment variables',
    'Invalid API key for OpenWeather API.',
    "Style property values shouldn't contain a semicolon.",
  ];
  return patterns.some((pattern) => message.includes(pattern));
};

console.error = (...args: unknown[]) => {
  const message = args
    .map((arg) => (typeof arg === 'string' ? arg : String(arg)))
    .join(' ');
  if (isExpectedTestNoise(message)) {
    return;
  }
  originalConsoleError(...args);
};

console.warn = (...args: unknown[]) => {
  const message = args
    .map((arg) => (typeof arg === 'string' ? arg : String(arg)))
    .join(' ');
  if (isExpectedTestNoise(message)) {
    return;
  }
  originalConsoleWarn(...args);
};

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

// Mock next/image globally to avoid Next runtime config warnings in unit tests.
// We keep key behavior defaults (lazy loading + async decoding) that tests assert.
vi.mock('next/image', () => ({
  default: ({ priority, loading, fill, ...props }: any) =>
    createElement('img', {
      ...props,
      loading: priority ? 'eager' : (loading ?? 'lazy'),
      decoding: props.decoding ?? 'async',
      fetchPriority: priority ? 'high' : props.fetchPriority,
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

// Mock ResizeObserver (required for Radix UI components)
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

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
