import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: process.env.BUILD_STATIC === 'true' ? 'export' : 'standalone',
  // For GitHub Pages deployment
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  images: {
    unoptimized: process.env.BUILD_STATIC === 'true', // Required for static export
  },
};

export default nextConfig;
