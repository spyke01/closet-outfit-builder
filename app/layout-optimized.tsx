import { Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { createQueryClient } from '../lib/query-client';
import { usePerformanceOptimization } from '../lib/hooks/use-performance-optimization';

// Optimized layout with performance enhancements
interface OptimizedLayoutProps {
  children: React.ReactNode;
  userId?: string;
}

// Create query client outside component to avoid recreation
let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: always make a new query client
    return createQueryClient();
  } else {
    // Browser: make a new query client if we don't already have one
    if (!browserQueryClient) browserQueryClient = createQueryClient();
    return browserQueryClient;
  }
}

// Performance monitoring component
function PerformanceMonitor({ userId }: { userId?: string }) {
  const { getPerformanceMetrics } = usePerformanceOptimization(userId);
  
  // Log performance metrics in development
  if (process.env.NODE_ENV === 'development') {
    setTimeout(() => {
      const metrics = getPerformanceMetrics();
      console.group('Performance Metrics');
      console.table(metrics.queryCache);
      console.table(metrics.imageCache);
      console.log('Recommendations:', metrics.recommendations);
      console.groupEnd();
    }, 5000); // Log after 5 seconds
  }
  
  return null;
}

// Optimized loading component
function OptimizedLoading() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}

// Error boundary for performance issues
function PerformanceErrorBoundary({ 
  children, 
  fallback 
}: { 
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  return (
    <Suspense fallback={fallback || <OptimizedLoading />}>
      {children}
    </Suspense>
  );
}

export function OptimizedLayout({ children, userId }: OptimizedLayoutProps) {
  const queryClient = getQueryClient();
  
  return (
    <QueryClientProvider client={queryClient}>
      <PerformanceErrorBoundary>
        <div className="min-h-screen bg-background">
          {/* Performance monitoring in development */}
          <PerformanceMonitor userId={userId} />
          
          {/* Main content with optimized rendering */}
          <main className="relative">
            {children}
          </main>
        </div>
        
        {/* React Query DevTools only in development */}
        {process.env.NODE_ENV === 'development' && (
          <ReactQueryDevtools initialIsOpen={false} />
        )}
      </PerformanceErrorBoundary>
    </QueryClientProvider>
  );
}

// HOC for page-level performance optimization
export function withPerformanceOptimization<P extends object>(
  Component: React.ComponentType<P>,
  options: {
    preloadData?: boolean;
    enableImageOptimization?: boolean;
    enableServerOptimization?: boolean;
  } = {}
) {
  const {
    preloadData = true,
    enableImageOptimization = true,
    enableServerOptimization = true,
  } = options;
  
  return function OptimizedComponent(props: P) {
    const userId = (props as any).userId;
    const { 
      cacheManagement, 
      batchOperations,
      getPerformanceMetrics 
    } = usePerformanceOptimization(userId);
    
    // Preload data on component mount
    if (preloadData && userId) {
      // This would typically be done in a useEffect, but for SSR we handle it differently
    }
    
    // Enhanced props with performance utilities
    const enhancedProps = {
      ...props,
      performanceUtils: {
        cacheManagement,
        batchOperations,
        getPerformanceMetrics,
        enableImageOptimization,
        enableServerOptimization,
      },
    };
    
    return <Component {...enhancedProps} />;
  };
}

// Utility for static generation with performance optimization
export async function getStaticPropsWithOptimization(
  context: any,
  dataFetcher: (context: any) => Promise<any>
) {
  const startTime = Date.now();
  
  try {
    const data = await dataFetcher(context);
    const generationTime = Date.now() - startTime;
    
    return {
      props: {
        ...data,
        _performanceMetrics: {
          staticGenerationTime: generationTime,
          generatedAt: new Date().toISOString(),
        },
      },
      // Revalidate every hour for ISR
      revalidate: 60 * 60,
    };
  } catch (error) {
    console.error('Static generation failed:', error);
    
    return {
      props: {
        _performanceMetrics: {
          staticGenerationTime: Date.now() - startTime,
          generatedAt: new Date().toISOString(),
          error: 'Static generation failed',
        },
      },
      revalidate: 60, // Retry in 1 minute on error
    };
  }
}

// Server-side rendering with performance optimization
export async function getServerSidePropsWithOptimization(
  context: any,
  dataFetcher: (context: any) => Promise<any>
) {
  const startTime = Date.now();
  
  try {
    const data = await dataFetcher(context);
    const renderTime = Date.now() - startTime;
    
    return {
      props: {
        ...data,
        _performanceMetrics: {
          serverRenderTime: renderTime,
          renderedAt: new Date().toISOString(),
        },
      },
    };
  } catch (error) {
    console.error('Server-side rendering failed:', error);
    
    return {
      props: {
        _performanceMetrics: {
          serverRenderTime: Date.now() - startTime,
          renderedAt: new Date().toISOString(),
          error: 'Server-side rendering failed',
        },
      },
    };
  }
}

// Performance-optimized image component
export function OptimizedImage({
  src,
  alt,
  width,
  height,
  priority = false,
  className = '',
  ...props
}: {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  priority?: boolean;
  className?: string;
  [key: string]: any;
}) {
  const { loadOptimizedImage } = usePerformanceOptimization();
  
  const imageProps = loadOptimizedImage(
    src,
    width && width <= 150 ? 'thumbnail' : 
    width && width <= 400 ? 'medium' : 'large'
  );
  
  return (
    <img
      {...imageProps}
      alt={alt}
      width={width}
      height={height}
      className={`${className} ${priority ? '' : 'lazy'}`}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      {...props}
    />
  );
}