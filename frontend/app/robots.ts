import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

// Required for metadata routes with `output: 'export'`.
export const dynamic = 'force-static';

// Statically generated at build time (output: 'export').
// NOTE: on GitHub Pages project sites this is served under the /Tools base
// path, not the domain root — it becomes fully effective once the site is
// served from its own (sub)domain.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Auth pages carry no indexable content.
        disallow: ['/auth'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
