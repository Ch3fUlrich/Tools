import type { NextConfig } from "next";
import path from "path";

// When building for GitHub Pages, set GITHUB_PAGES=true.
// The site will be served at https://<owner>.github.io/<repo>/.
const isGitHubPages = process.env.GITHUB_PAGES === 'true';
const repoName = process.env.GITHUB_REPOSITORY_NAME || 'Tools';

const nextConfig: NextConfig = {
  // Static export — required for GitHub Pages and Docker nginx serving.
  output: 'export',

  // basePath + assetPrefix are needed when serving from a sub-path (GitHub Pages).
  // For regular deployments (Docker, Vercel) leave them empty.
  basePath: isGitHubPages ? `/${repoName}` : '',
  assetPrefix: isGitHubPages ? `/${repoName}/` : '',

  // Use Turbopack (Next 16 default). Explicit root silences the workspace-root
  // inference warning when multiple lockfiles are present.
  turbopack: {
    root: path.resolve(__dirname, '..'),
  },
};

export default nextConfig;
