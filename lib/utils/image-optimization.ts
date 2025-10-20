import { createClient } from '../supabase/client';

// Image optimization utilities for Supabase Storage CDN
export class ImageOptimizer {
  private supabase = createClient();
  private cache = new Map<string, string>();
  
  // Generate optimized image URL with CDN parameters
  generateOptimizedUrl(
    bucket: string,
    path: string,
    options: {
      width?: number;
      height?: number;
      quality?: number;
      format?: 'webp' | 'avif' | 'jpeg' | 'png';
      resize?: 'cover' | 'contain' | 'fill';
    } = {}
  ): string {
    const cacheKey = `${bucket}/${path}/${JSON.stringify(options)}`;
    
    // Return cached URL if available
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }
    
    // Get base public URL
    const { data } = this.supabase.storage.from(bucket).getPublicUrl(path);
    let optimizedUrl = data.publicUrl;
    
    // Add optimization parameters
    const params = new URLSearchParams();
    
    if (options.width) params.set('width', options.width.toString());
    if (options.height) params.set('height', options.height.toString());
    if (options.quality) params.set('quality', options.quality.toString());
    if (options.format) params.set('format', options.format);
    if (options.resize) params.set('resize', options.resize);
    
    if (params.toString()) {
      optimizedUrl += `?${params.toString()}`;
    }
    
    // Cache the result
    this.cache.set(cacheKey, optimizedUrl);
    
    return optimizedUrl;
  }
  
  // Generate responsive image URLs for different breakpoints
  generateResponsiveUrls(
    bucket: string,
    path: string,
    options: {
      quality?: number;
      format?: 'webp' | 'avif' | 'jpeg' | 'png';
      breakpoints?: number[];
    } = {}
  ): Array<{ width: number; url: string }> {
    const defaultBreakpoints = [320, 640, 768, 1024, 1280, 1920];
    const breakpoints = options.breakpoints || defaultBreakpoints;
    const format = options.format || 'webp';
    const quality = options.quality || 80;
    
    return breakpoints.map(width => ({
      width,
      url: this.generateOptimizedUrl(bucket, path, {
        width,
        quality,
        format,
        resize: 'cover',
      }),
    }));
  }
  
  // Preload critical images
  preloadImage(url: string, priority: 'high' | 'low' = 'low'): void {
    if (typeof window === 'undefined') return;
    
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = url;
    link.fetchPriority = priority;
    
    document.head.appendChild(link);
  }
  
  // Lazy load images with intersection observer
  lazyLoadImage(
    img: HTMLImageElement,
    src: string,
    options: {
      rootMargin?: string;
      threshold?: number;
    } = {}
  ): void {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      img.src = src;
      return;
    }
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const target = entry.target as HTMLImageElement;
            target.src = src;
            target.classList.remove('lazy');
            observer.unobserve(target);
          }
        });
      },
      {
        rootMargin: options.rootMargin || '50px',
        threshold: options.threshold || 0.1,
      }
    );
    
    observer.observe(img);
  }
  
  // Clear image URL cache
  clearCache(): void {
    this.cache.clear();
  }
  
  // Get cache size for monitoring
  getCacheSize(): number {
    return this.cache.size;
  }
}

// Singleton instance
export const imageOptimizer = new ImageOptimizer();

// Utility functions for common use cases
export const optimizeWardrobeItemImage = (
  imagePath: string,
  size: 'thumbnail' | 'medium' | 'large' = 'medium'
) => {
  const sizeMap = {
    thumbnail: { width: 150, height: 150 },
    medium: { width: 400, height: 400 },
    large: { width: 800, height: 800 },
  };
  
  return imageOptimizer.generateOptimizedUrl('wardrobe-images', imagePath, {
    ...sizeMap[size],
    quality: 85,
    format: 'webp',
    resize: 'cover',
  });
};

export const generateOutfitImageSrcSet = (imagePath: string) => {
  const responsiveUrls = imageOptimizer.generateResponsiveUrls('wardrobe-images', imagePath, {
    quality: 80,
    format: 'webp',
  });
  
  return responsiveUrls
    .map(({ width, url }) => `${url} ${width}w`)
    .join(', ');
};

// Performance monitoring
export const imagePerformanceMonitor = {
  loadTimes: new Map<string, number>(),
  
  startLoad(url: string): void {
    this.loadTimes.set(url, performance.now());
  },
  
  endLoad(url: string): number {
    const startTime = this.loadTimes.get(url);
    if (!startTime) return 0;
    
    const loadTime = performance.now() - startTime;
    this.loadTimes.delete(url);
    
    // Log slow loading images
    if (loadTime > 2000) {
      console.warn(`Slow image load: ${url} took ${loadTime.toFixed(2)}ms`);
    }
    
    return loadTime;
  },
  
  getAverageLoadTime(): number {
    const times = Array.from(this.loadTimes.values());
    return times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
  },
};