import { describe, expect, it } from 'vitest';
import { isIndexableSitemapRoute } from '@/lib/seo/sitemap';

describe('isIndexableSitemapRoute', () => {
  it('includes public marketing routes', () => {
    expect(isIndexableSitemapRoute([])).toBe(true);
    expect(isIndexableSitemapRoute(['about'])).toBe(true);
    expect(isIndexableSitemapRoute(['pricing'])).toBe(true);
  });

  it('excludes private application areas', () => {
    expect(isIndexableSitemapRoute(['wardrobe'])).toBe(false);
    expect(isIndexableSitemapRoute(['admin'])).toBe(false);
    expect(isIndexableSitemapRoute(['auth', 'login'])).toBe(false);
  });

  it('excludes dynamic routes', () => {
    expect(isIndexableSitemapRoute(['anchor', '[category]'])).toBe(false);
    expect(isIndexableSitemapRoute(['support', '[id]'])).toBe(false);
  });
});
