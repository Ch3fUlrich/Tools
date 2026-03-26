import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep using static export behavior.
  output: 'export',
  // Use Turbopack (Next 16 default). An explicit empty config avoids errors when
  // previously there was a webpack customization. We removed webpack hooks so
  // Turbopack can run without conflict. Set a turbopack.root to silence the
  // workspace-root inference warning when multiple lockfiles are present.
  turbopack: {
    // Set root to workspace root to avoid inference issues
    root: require('path').resolve(__dirname, '..'),
  },
};

export default nextConfig;
