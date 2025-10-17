# GitHub Pages Deployment Guide

This document explains how to deploy the frontend to GitHub Pages automatically.

## Quick Setup

### 1. Enable GitHub Pages

1. Go to your repository on GitHub
2. Click **Settings** → **Pages** (in the sidebar)
3. Under **Source**, select **GitHub Actions**
4. Save the changes

That's it! The frontend will now automatically deploy to GitHub Pages whenever you push to the `main` branch.

## How It Works

### Automatic Deployment

The `.github/workflows/pages.yml` workflow:
- Triggers on every push to `main` branch that modifies frontend files
- Builds the Next.js application as a static export
- Uploads the build artifacts to GitHub Pages
- Deploys the site automatically

### Build Configuration

The workflow sets these environment variables:
```bash
BUILD_STATIC=true                  # Enable static export
NEXT_PUBLIC_BASE_PATH=             # Base path (empty for root)
NEXT_PUBLIC_API_URL=https://your-backend-url.com  # Backend API
```

### What Gets Deployed

- **Static HTML/CSS/JS**: The entire Next.js app exported as static files
- **Assets**: All images, fonts, and other static assets
- **Client-side routing**: Using Next.js built-in routing

## Accessing Your Site

After deployment, your site will be available at:

```
https://[username].github.io/[repository-name]/
```

For example:
```
https://ch3fulrich.github.io/Tools/
```

## Configuration Options

### Using a Custom Domain

1. Add a `CNAME` file to `frontend/public/` with your domain:
   ```
   yourdomain.com
   ```

2. Configure DNS:
   - Add a CNAME record pointing to `[username].github.io`
   - Or add A records for GitHub Pages IPs

3. Update in GitHub Settings → Pages → Custom domain

### Configuring Base Path

If deploying to a subdirectory (e.g., `/tools`), update the workflow:

```yaml
env:
  NEXT_PUBLIC_BASE_PATH: /tools
```

And update `next.config.ts` to use the base path.

### Connecting to a Backend

Since GitHub Pages only hosts static files, you need a backend separately:

**Option 1: Use your own backend**
```yaml
env:
  NEXT_PUBLIC_API_URL: https://api.yourdomain.com
```

**Option 2: Use a cloud service**
- Deploy backend to Heroku, Railway, Fly.io, etc.
- Update the API URL in the workflow

**Option 3: Serverless functions**
- Use Vercel/Netlify serverless functions
- Migrate API endpoints to serverless

## Limitations

### What Works on GitHub Pages
✅ Static HTML, CSS, JavaScript
✅ Client-side routing
✅ React components and interactions
✅ Client-side API calls (to external backend)
✅ Static assets (images, fonts, etc.)

### What Doesn't Work
❌ Server-side rendering (SSR)
❌ API routes (need separate backend)
❌ Server-side data fetching
❌ Incremental Static Regeneration (ISR)
❌ Image optimization (uses unoptimized images)

## Manual Deployment

If you prefer manual deployment:

1. **Build for production:**
   ```bash
   cd frontend
   BUILD_STATIC=true npm run build
   ```

2. **Output is in `frontend/out/` directory**

3. **Deploy to any static host:**
   - GitHub Pages: Push to `gh-pages` branch
   - Netlify: Drag and drop the `out` folder
   - Vercel: Connect repository
   - S3/CloudFront: Upload to S3 bucket

## Troubleshooting

### Deployment Fails

**Check workflow logs:**
1. Go to Actions tab
2. Click on failed workflow
3. Review error messages

**Common issues:**
- Missing dependencies: `npm ci` failed
- Build errors: Check Next.js configuration
- Permission issues: Ensure GitHub Actions has write permissions

### Site Not Updating

**Force rebuild:**
1. Go to Actions tab
2. Select "Deploy to GitHub Pages" workflow
3. Click "Run workflow" → "Run workflow"

**Clear cache:**
```bash
# In workflow, before build:
rm -rf frontend/.next
rm -rf frontend/out
```

### 404 Errors

**Client-side routing:**
- GitHub Pages doesn't support client-side routing out of the box
- Next.js handles this automatically with static export
- If issues persist, check `next.config.ts` configuration

### API Calls Failing

**CORS issues:**
- Backend must allow requests from GitHub Pages domain
- Update `ALLOWED_ORIGINS` in backend:
  ```bash
  ALLOWED_ORIGINS=https://username.github.io
  ```

**API URL:**
- Ensure `NEXT_PUBLIC_API_URL` points to correct backend
- Backend must be deployed and accessible

## Best Practices

### Development Workflow

1. **Test locally first:**
   ```bash
   BUILD_STATIC=true npm run build
   npx serve out
   ```

2. **Preview on localhost:**
   - Open http://localhost:3000
   - Test all features
   - Check browser console for errors

3. **Push to main:**
   ```bash
   git push origin main
   ```

### Security

- Never commit API keys or secrets
- Use environment variables for sensitive data
- Backend API must implement authentication
- CORS should be restricted to your domain

### Performance

- **Optimize images**: Use Next.js Image component
- **Minimize JavaScript**: Code splitting works automatically
- **Cache assets**: GitHub Pages provides CDN caching
- **Monitor size**: Keep build size reasonable

## Alternative Hosting

If GitHub Pages doesn't meet your needs:

### Vercel (Recommended for Next.js)
- Full SSR support
- Automatic deployments
- Free tier available
- Better performance for Next.js apps

### Netlify
- Good for static sites
- Serverless functions available
- Automatic deployments
- Free tier available

### Cloudflare Pages
- Fast CDN
- Unlimited bandwidth
- Free tier
- Good for static sites

## Additional Resources

- [Next.js Static Export Documentation](https://nextjs.org/docs/app/building-your-application/deploying/static-exports)
- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Troubleshooting Next.js Deployments](https://nextjs.org/docs/deployment)

## Support

If you encounter issues:
1. Check the workflow logs in GitHub Actions
2. Review this documentation
3. Check existing GitHub Issues
4. Open a new issue with details:
   - Error messages
   - Workflow logs
   - Steps to reproduce

---

Happy deploying! 🚀
