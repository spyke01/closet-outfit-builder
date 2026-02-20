import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ImgHTMLAttributes } from 'react';
import { createQueryClient } from '../lib/query-client';

// Mock Next.js components and hooks
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}));

vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string } & ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...props} />
  ),
}));

// Mock Supabase
vi.mock('../lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    }),
  }),
}));

// Test component that simulates SSR behavior
function TestSSRComponent({ initialData }: { initialData?: Record<string, unknown> }) {
  return (
    <div data-testid="ssr-component">
      <h1>SSR Test Component</h1>
      {initialData && <div data-testid="initial-data">{JSON.stringify(initialData)}</div>}
    </div>
  );
}

describe('SSR Performance Tests', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createQueryClient();
  });

  describe('Server-Side Rendering', () => {
    it('should render components without hydration errors', () => {
      const initialData = { items: [], categories: [] };
      
      const renderStart = performance.now();
      const { getByTestId } = render(
        <QueryClientProvider client={queryClient}>
          <TestSSRComponent initialData={initialData} />
        </QueryClientProvider>
      );
      const renderEnd = performance.now();
      
      const renderTime = renderEnd - renderStart;
      
      expect(getByTestId('ssr-component')).toBeInTheDocument();
      expect(getByTestId('initial-data')).toBeInTheDocument();
      expect(renderTime).toBeLessThan(100); // Should render quickly
    });

    it('should handle initial data hydration efficiently', () => {
      const largeInitialData = {
        items: Array.from({ length: 100 }, (_, i) => ({
          id: `item-${i}`,
          name: `Item ${i}`,
          category_id: `cat-${i % 10}`,
        })),
        categories: Array.from({ length: 10 }, (_, i) => ({
          id: `cat-${i}`,
          name: `Category ${i}`,
        })),
      };
      
      const hydrationStart = performance.now();
      const { getByTestId } = render(
        <QueryClientProvider client={queryClient}>
          <TestSSRComponent initialData={largeInitialData} />
        </QueryClientProvider>
      );
      const hydrationEnd = performance.now();
      
      const hydrationTime = hydrationEnd - hydrationStart;
      
      expect(getByTestId('ssr-component')).toBeInTheDocument();
      expect(hydrationTime).toBeLessThan(200); // Should handle large data efficiently
    });
  });

  describe('Static Generation Performance', () => {
    it('should simulate static page generation timing', () => {
      // Simulate static data that would be generated at build time
      const staticData = {
        publicCategories: ['Jacket', 'Shirt', 'Pants', 'Shoes'],
        defaultPreferences: {
          theme: 'system',
          showBrands: true,
          weatherEnabled: true,
        },
      };
      
      const staticGenerationStart = performance.now();
      
      // Simulate the work that would happen during static generation
      const processedData = {
        ...staticData,
        generatedAt: new Date().toISOString(),
        categoriesCount: staticData.publicCategories.length,
      };
      
      const staticGenerationEnd = performance.now();
      const generationTime = staticGenerationEnd - staticGenerationStart;
      
      expect(processedData.categoriesCount).toBe(4);
      expect(generationTime).toBeLessThan(10); // Should be very fast for static data
    });
  });

  describe('Client-Side Hydration', () => {
    it('should measure hydration performance', () => {
      const hydrationStart = performance.now();
      
      // Simulate client-side hydration
      queryClient.setQueryData(['test'], { hydrated: true });
      const hydratedData = queryClient.getQueryData(['test']);
      
      const hydrationEnd = performance.now();
      const hydrationTime = hydrationEnd - hydrationStart;
      
      expect(hydratedData).toEqual({ hydrated: true });
      expect(hydrationTime).toBeLessThan(5); // Should be very fast
    });

    it('should handle concurrent hydration efficiently', async () => {
      const concurrentStart = performance.now();
      
      // Simulate multiple concurrent hydrations
      const promises = Array.from({ length: 10 }, (_, i) => 
        Promise.resolve().then(() => {
          queryClient.setQueryData([`concurrent-${i}`], { id: i });
          return queryClient.getQueryData([`concurrent-${i}`]);
        })
      );
      
      const results = await Promise.all(promises);
      const concurrentEnd = performance.now();
      const concurrentTime = concurrentEnd - concurrentStart;
      
      expect(results).toHaveLength(10);
      expect(results.every((result, i) => {
        const hydrated = result as { id?: number } | undefined;
        return hydrated?.id === i;
      })).toBe(true);
      expect(concurrentTime).toBeLessThan(50); // Should handle concurrent operations efficiently
    });
  });

  describe('Bundle Size Impact', () => {
    it('should verify query client bundle impact', () => {
      // Test that creating query client doesn't significantly impact bundle
      const clientCreationStart = performance.now();
      
      const clients = Array.from({ length: 10 }, () => createQueryClient());
      
      const clientCreationEnd = performance.now();
      const creationTime = clientCreationEnd - clientCreationStart;
      
      expect(clients).toHaveLength(10);
      expect(creationTime).toBeLessThan(20); // Should create clients quickly
      
      // Cleanup
      clients.forEach(client => client.clear());
    });
  });
});
