import type { MetadataRoute } from 'next';
import { PUBLIC_ROUTES, SITE_URL } from '@/lib/site';

// Required for metadata routes with `output: 'export'`.
export const dynamic = 'force-static';

// Statically generated at build time (output: 'export').
export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_ROUTES.map((route) => ({
    url: route === '/' ? `${SITE_URL}/` : `${SITE_URL}${route}`,
    changeFrequency: 'monthly',
    priority: route === '/' ? 1 : 0.8,
  }));
}
