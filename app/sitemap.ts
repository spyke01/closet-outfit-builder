import type { MetadataRoute } from 'next';
import { getCanonicalSiteUrl } from '@/lib/seo/site-url';
import { getIndexableSitemapRoutes } from '@/lib/seo/sitemap';

export const dynamic = 'force-static';

function toAbsoluteUrl(siteUrl: string, route: string): string {
  if (route === '/') {
    return `${siteUrl}/`;
  }

  return `${siteUrl}${route}/`;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getCanonicalSiteUrl();
  const routes = await getIndexableSitemapRoutes();

  return routes.map(({ route, lastModified }) => ({
    url: toAbsoluteUrl(siteUrl, route),
    lastModified,
    changeFrequency: route === '/' ? 'daily' : 'weekly',
    priority: route === '/' ? 1 : route === '/pricing' ? 0.9 : 0.7,
  }));
}
