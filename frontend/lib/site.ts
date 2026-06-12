// Canonical site origin used for metadata, sitemap and robots generation.
// Override with NEXT_PUBLIC_SITE_URL for non-GitHub-Pages deployments (Docker).
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ch3fulrich.github.io/Tools';

export const SITE_NAME = 'Tools Collection';

export const SITE_DESCRIPTION =
  'A collection of useful tools for everyday tasks: fat loss calculator, dice roller, blood level calculator, N26 transaction analyzer and training planner.';

// Public, indexable routes — keep in sync with the tools[] array in app/page.tsx.
export const PUBLIC_ROUTES = [
  '/',
  '/tools/dice',
  '/tools/fat-loss',
  '/tools/bloodlevel',
  '/tools/n26',
  '/tools/timeline',
  '/tools/training',
] as const;
