/**
 * Image optimization utilities for wardrobe items
 * Simplified version without caching to avoid cache API errors
 */

export interface ImageOptimizationOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png';
}

export class ImageOptimizer {
  /**
   * Get optimized image URL
   */
  getOptimizedUrl(
    originalUrl: string,
    options: ImageOptimizationOptions = {}
  ): string {
    const {
      width = 400,
      height = 400,
      quality = 80,
      format = 'webp'
    } = options;

    // For Supabase storage URLs, use transform parameters
    if (originalUrl.includes('supabase.co/storage')) {
      const url = new URL(originalUrl);
      url.searchParams.set('width', width.toString());
      url.searchParams.set('height', height.toString());
      url.searchParams.set('quality', quality.toString());
      url.searchParams.set('format', format);
      return url.toString();
    }

    // For other URLs, return as-is (could add other CDN support here)
    return originalUrl;
  }

  /**
   * Get responsive image URLs for different screen sizes
   */
  getResponsiveUrls(originalUrl: string): {
    small: string;
    medium: string;
    large: string;
  } {
    return {
      small: this.getOptimizedUrl(originalUrl, { width: 200, height: 200 }),
      medium: this.getOptimizedUrl(originalUrl, { width: 400, height: 400 }),
      large: this.getOptimizedUrl(originalUrl, { width: 800, height: 800 }),
    };
  }

  /**
   * Get optimized URL for thumbnail
   */
  getThumbnailUrl(originalUrl: string): string {
    return this.getOptimizedUrl(originalUrl, {
      width: 150,
      height: 150,
      quality: 70,
    });
  }

  /**
   * Get optimized URL for card display
   */
  getCardUrl(originalUrl: string): string {
    return this.getOptimizedUrl(originalUrl, {
      width: 300,
      height: 300,
      quality: 80,
    });
  }

  /**
   * Get optimized URL for full display
   */
  getFullUrl(originalUrl: string): string {
    return this.getOptimizedUrl(originalUrl, {
      width: 600,
      height: 600,
      quality: 85,
    });
  }

  /**
   * Preload critical images (simplified without caching)
   */
  preloadImage(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = url;
    });
  }

  /**
   * Batch preload multiple images
   */
  async preloadImages(urls: string[]): Promise<void> {
    const promises = urls.map(url => this.preloadImage(url));
    await Promise.allSettled(promises);
  }
}

// Export singleton instance
export const imageOptimizer = new ImageOptimizer();