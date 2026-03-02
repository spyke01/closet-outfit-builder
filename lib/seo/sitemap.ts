import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';

export type SitemapRouteEntry = {
  route: string;
  lastModified: Date;
};

const APP_DIRECTORY = path.join(process.cwd(), 'app');
const PAGE_FILE_PATTERN = /^page\.(?:js|jsx|ts|tsx|mdx)$/;
const EXCLUDED_ROOT_SEGMENTS = new Set([
  'admin',
  'api',
  'auth',
  'billing',
  'calendar',
  'debug',
  'onboarding',
  'outfits',
  'protected',
  'settings',
  'sizes',
  'support',
  'today',
  'wardrobe',
]);

function isRouteGroupSegment(segment: string): boolean {
  return segment.startsWith('(') && segment.endsWith(')');
}

function isDynamicSegment(segment: string): boolean {
  return segment.includes('[') || segment.includes(']');
}

function isPrivateSegment(segment: string): boolean {
  return segment.startsWith('_');
}

function toRoutePath(routeSegments: string[]): string {
  if (routeSegments.length === 0) {
    return '/';
  }

  return `/${routeSegments.join('/')}`;
}

export function isIndexableSitemapRoute(routeSegments: string[]): boolean {
  if (routeSegments.some(isDynamicSegment)) {
    return false;
  }

  const [rootSegment] = routeSegments;
  if (!rootSegment) {
    return true;
  }

  return !EXCLUDED_ROOT_SEGMENTS.has(rootSegment);
}

async function collectRoutes(
  directory: string,
  routeSegments: string[] = [],
): Promise<SitemapRouteEntry[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const routes: SitemapRouteEntry[] = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === 'api' || isPrivateSegment(entry.name) || isDynamicSegment(entry.name)) {
        continue;
      }

      if (routeSegments.length === 0 && EXCLUDED_ROOT_SEGMENTS.has(entry.name)) {
        continue;
      }

      const nextSegments = isRouteGroupSegment(entry.name)
        ? routeSegments
        : [...routeSegments, entry.name];

      routes.push(...await collectRoutes(entryPath, nextSegments));
      continue;
    }

    if (!PAGE_FILE_PATTERN.test(entry.name) || !isIndexableSitemapRoute(routeSegments)) {
      continue;
    }

    const fileStats = await stat(entryPath);
    routes.push({
      route: toRoutePath(routeSegments),
      lastModified: fileStats.mtime,
    });
  }

  return routes;
}

export async function getIndexableSitemapRoutes(): Promise<SitemapRouteEntry[]> {
  const routes = await collectRoutes(APP_DIRECTORY);

  return routes.sort((left, right) => left.route.localeCompare(right.route));
}
