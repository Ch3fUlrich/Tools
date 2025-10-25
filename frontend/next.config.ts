import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep using static export behavior.
  output: 'export',
  // Use Turbopack (Next 16 default). An explicit empty config avoids errors when
  // previously there was a webpack customization. We removed webpack hooks so
  // Turbopack can run without conflict. Set a turbopack.root to silence the
  // workspace-root inference warning when multiple lockfiles are present.
  turbopack: {
    // Use an absolute path for the turbopack root to avoid any ambiguity
    // about the package root when Next resolves the project path. This
    // prevents Turbopack from inferring a distDir that navigates outside
    // the intended projectPath (which triggers the "Invalid distDirRoot"
    // panic).
    // __dirname is the directory where this config file lives (the
    // `frontend` package root when this file is evaluated by Next).
    root: __dirname,
  },
};

export default nextConfig;
