# Release Management Guide

This document explains how to create and manage releases for the Tools project.

## Overview

The project uses automated releases via GitHub Actions. When you push a version tag, the system automatically:
- Builds the backend binary
- Builds the frontend for production
- Generates checksums for verification
- Creates a GitHub Release with all artifacts
- Extracts release notes from CHANGELOG.md

## Creating a Release

### Prerequisites

- Maintainer access to the repository
- All changes merged to `main` branch
- All tests passing
- CHANGELOG.md updated

### Step-by-Step Process

#### 1. Update CHANGELOG.md

Add a new version section at the top of `CHANGELOG.md`:

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added
- New feature 1
- New feature 2

### Changed
- Modified feature 3
- Updated dependency 4

### Fixed
- Bug fix 1
- Bug fix 2

### Removed
- Deprecated feature 1
```

#### 2. Update Version Numbers (Optional)

Update versions in package files:

**Backend (`backend/Cargo.toml`):**
```toml
[package]
name = "tools-backend"
version = "X.Y.Z"
```

**Frontend (`frontend/package.json`):**
```json
{
  "name": "frontend",
  "version": "X.Y.Z",
  ...
}
```

#### 3. Commit Changes

```bash
git add CHANGELOG.md backend/Cargo.toml frontend/package.json
git commit -m "chore: Bump version to X.Y.Z"
git push origin main
```

#### 4. Create Version Tag

```bash
# Create annotated tag
git tag -a vX.Y.Z -m "Release version X.Y.Z"

# Push tag to trigger release workflow
git push origin vX.Y.Z
```

**Important**: Tag format must be `vX.Y.Z` (e.g., `v1.0.0`, `v0.2.1`)

#### 5. Monitor Release Build

1. Go to repository **Actions** tab
2. Find the "Create Release" workflow
3. Monitor the build progress
4. Wait for completion (typically 5-10 minutes)

#### 6. Verify Release

Once complete:
1. Go to repository **Releases** page
2. Verify the new release appears
3. Check that all artifacts are present:
   - `tools-backend` (Linux binary)
   - `tools-backend.sha256` (checksum)
   - `frontend-build.tar.gz` (Next.js build)
   - `frontend-build.tar.gz.sha256` (checksum)
   - `docker-compose.yml`
   - `README.txt`

## Release Types

### Semantic Versioning

We follow [Semantic Versioning (SemVer)](https://semver.org/):

```
vMAJOR.MINOR.PATCH
```

#### MAJOR (v2.0.0)
Breaking changes that are not backward compatible:
- API endpoint changes
- Removed features
- Changed behavior that breaks existing usage

#### MINOR (v1.1.0)
New features that are backward compatible:
- New API endpoints
- New tools added
- New configuration options
- Performance improvements

#### PATCH (v1.0.1)
Bug fixes and minor updates:
- Bug fixes
- Security patches
- Documentation updates
- Dependency updates

### Pre-release Versions

For beta/alpha releases, use:
```bash
git tag -a v1.0.0-beta.1 -m "Beta release"
git push origin v1.0.0-beta.1
```

Pre-releases will be marked as "Pre-release" on GitHub.

## Release Artifacts

### What Gets Released

Each release includes:

#### 1. Backend Binary (`tools-backend`)
- Linux x86_64 binary
- Compiled with release optimizations
- Ready to run on most Linux distributions
- Size: ~10-20 MB

**Usage:**
```bash
chmod +x tools-backend
./tools-backend
```

#### 2. Frontend Build (`frontend-build.tar.gz`)
- Production-optimized Next.js build
- Contains `.next/` directory
- Ready for deployment

**Usage:**
```bash
tar -xzf frontend-build.tar.gz
cd frontend
npm install next
npm start
```

#### 3. Checksums
SHA256 checksums for verification:
```bash
sha256sum -c tools-backend.sha256
sha256sum -c frontend-build.tar.gz.sha256
```

#### 4. Docker Compose File
Ready-to-use `docker-compose.yml` for easy deployment.

#### 5. README.txt
Quick start instructions for using release artifacts.

## Using Releases

### For End Users

#### Download Pre-built Artifacts

1. Visit the [Releases page](https://github.com/Ch3fUlrich/Tools/releases)
2. Click on the latest release
3. Download desired artifacts from the "Assets" section
4. Verify checksums (recommended)

#### Verify Downloads

```bash
# Verify backend binary
sha256sum tools-backend
cat tools-backend.sha256

# Verify frontend build
sha256sum frontend-build.tar.gz
cat frontend-build.tar.gz.sha256
```

#### Deploy with Docker

```bash
# Download docker-compose.yml
curl -LO https://github.com/Ch3fUlrich/Tools/releases/download/vX.Y.Z/docker-compose.yml

# Start services
docker-compose up -d
```

### For Developers

#### Install Specific Version

```bash
# Clone specific version
git clone --branch vX.Y.Z https://github.com/Ch3fUlrich/Tools.git

# Or checkout tag
git checkout vX.Y.Z
```

#### Build from Source

```bash
# Backend
cd backend
cargo build --release

# Frontend
cd frontend
npm ci
npm run build
```

## Release Workflow Details

### Workflow File

Location: `.github/workflows/release.yml`

### Trigger

Automatically runs when a tag matching `v*.*.*` is pushed.

### Steps

1. **Verify Tag Format**
   - Ensures tag follows semantic versioning
   - Extracts version number

2. **Extract Changelog**
   - Reads CHANGELOG.md
   - Extracts section for the current version
   - Uses as release notes

3. **Build Backend**
   - Installs Rust toolchain
   - Compiles release binary
   - Generates SHA256 checksum

4. **Build Frontend**
   - Installs Node.js and dependencies
   - Runs production build
   - Creates tarball and checksum

5. **Prepare Artifacts**
   - Copies all build artifacts
   - Creates README.txt
   - Organizes files

6. **Create GitHub Release**
   - Uploads all artifacts
   - Sets release notes
   - Marks as pre-release if needed
   - Generates additional notes from commits

### Build Time

Typical build times:
- Backend: 2-3 minutes
- Frontend: 1-2 minutes
- Total: 5-7 minutes

## Troubleshooting

### Tag Already Exists

If you need to recreate a tag:

```bash
# Delete local tag
git tag -d vX.Y.Z

# Delete remote tag
git push origin :refs/tags/vX.Y.Z

# Create new tag
git tag -a vX.Y.Z -m "Release version X.Y.Z"
git push origin vX.Y.Z
```

⚠️ **Warning**: Only do this for unreleased tags!

### Build Fails

**Check workflow logs:**
1. Go to Actions tab
2. Click on failed workflow run
3. Review error logs

**Common issues:**
- Tests failing: Fix tests before creating release
- Compilation errors: Check code on main branch
- Missing changelog: Add changelog entry for version

### Missing Artifacts

If artifacts are missing from release:
1. Check workflow completed successfully
2. Review workflow logs for upload errors
3. Verify file paths in workflow
4. Re-run workflow if needed

## Best Practices

### Before Releasing

- [ ] All tests pass on main branch
- [ ] No open security vulnerabilities
- [ ] CHANGELOG.md is updated
- [ ] Documentation is up to date
- [ ] Breaking changes are clearly documented
- [ ] Migration guide provided (for breaking changes)

### Release Naming

Use clear, descriptive names:
- ✅ Good: "v1.2.0 - Add new calculator tool"
- ❌ Bad: "v1.2.0"

### Release Notes

Include in CHANGELOG.md:
- **Added**: New features
- **Changed**: Changes to existing functionality
- **Deprecated**: Soon-to-be removed features
- **Removed**: Removed features
- **Fixed**: Bug fixes
- **Security**: Security fixes

### Communication

After releasing:
1. Announce in GitHub Discussions
2. Update README if needed
3. Notify users of breaking changes
4. Update deployment documentation

## Automation Benefits

### Why Automated Releases?

✅ **Consistency**: Same build process every time
✅ **Reproducibility**: Tagged source matches artifacts
✅ **Speed**: Faster than manual process
✅ **Quality**: All tests must pass
✅ **Transparency**: Public build logs
✅ **Convenience**: One command to release

### Security

- Builds run in isolated environment
- Source code is always from tagged commit
- Artifacts have checksums for verification
- No manual steps reduce human error

## Future Enhancements

Planned improvements:
- [ ] Multi-platform binaries (macOS, Windows)
- [ ] Automated security scanning
- [ ] Release candidate workflow
- [ ] Automated deployment to staging
- [ ] Release statistics and metrics

## Questions?

If you have questions about releases:
1. Check this documentation
2. Review existing releases for examples
3. Ask in GitHub Discussions
4. Contact maintainers

---

Happy releasing! 🎉
