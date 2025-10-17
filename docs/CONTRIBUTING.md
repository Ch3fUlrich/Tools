# Collaboration Guidelines

## Overview

Welcome to the Tools project! This document outlines how to contribute effectively to this open-source project.

## Getting Started

### Prerequisites

**Backend (Rust):**
- Rust 1.75+ (install via [rustup](https://rustup.rs/))
- Cargo (comes with Rust)

**Frontend (Next.js):**
- Node.js 18+ and npm
- Git

### Initial Setup

1. **Fork the repository** on GitHub
2. **Clone your fork:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/Tools.git
   cd Tools
   ```

3. **Set up the backend:**
   ```bash
   cd backend
   cargo build
   cargo test
   ```

4. **Set up the frontend:**
   ```bash
   cd frontend
   npm install
   npm run build
   ```

## Development Workflow

### Branch Strategy

- `main` - Production-ready code
- `develop` - Integration branch for features
- `feature/*` - New features
- `bugfix/*` - Bug fixes
- `hotfix/*` - Urgent production fixes

### Creating a Feature

1. **Create a new branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following the guidelines below

3. **Test thoroughly:**
   ```bash
   # Backend
   cd backend
   cargo test
   cargo clippy
   
   # Frontend
   cd frontend
   npm run build
   npm run lint
   ```

4. **Commit with clear messages:**
   ```bash
   git commit -m "feat: Add new tool for XYZ"
   ```

5. **Push to your fork:**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create a Pull Request** on GitHub

## Coding Standards

**IMPORTANT**: All code must follow the rules in [CODING_RULES.md](CODING_RULES.md).

### Quick Reference

**Before committing, ensure:**
- [ ] Code passes linting: `cargo clippy -- -D warnings` (backend) or `npm run lint` (frontend)
- [ ] Code is formatted: `cargo fmt` (backend) or `npm run lint -- --fix` (frontend)
- [ ] No trailing whitespace or extra blank lines
- [ ] All tests pass: `cargo test` (backend)
- [ ] Code follows DRY principle (Don't Repeat Yourself)
- [ ] Functions are small and focused (max 50 lines)
- [ ] Error handling is proper (no `.unwrap()` without justification)

For detailed guidelines, see [CODING_RULES.md](CODING_RULES.md).

### Rust Backend

#### Code Style

- Follow Rust naming conventions:
  - `snake_case` for functions and variables
  - `PascalCase` for types and traits
  - `SCREAMING_SNAKE_CASE` for constants

- Use `rustfmt` for formatting:
  ```bash
  cargo fmt
  ```

- Use `clippy` for linting:
  ```bash
  cargo clippy -- -D warnings
  ```

#### Project Structure

```
backend/
├── src/
│   ├── main.rs          # Application entry point
│   ├── api/             # API handlers
│   │   ├── mod.rs
│   │   ├── fat_loss.rs
│   │   └── n26_analyzer.rs
│   └── tools/           # Business logic
│       ├── mod.rs
│       ├── fat_loss.rs
│       └── n26_analyzer.rs
├── tests/               # Integration tests
└── Cargo.toml
```

#### Best Practices

1. **Error Handling**: Use `Result<T, E>` appropriately
2. **Documentation**: Add doc comments for public functions
   ```rust
   /// Calculate fat loss percentage
   ///
   /// # Arguments
   /// * `kcal_deficit` - Calorie deficit in kcal
   /// * `weight_loss_kg` - Weight loss in kg
   pub fn calculate_fat_loss_percentage(kcal_deficit: f64, weight_loss_kg: f64) -> FatLossResponse
   ```
3. **Testing**: Write unit tests for all business logic
4. **Type Safety**: Leverage Rust's type system
5. **Modularity**: Keep functions small and focused

### TypeScript Frontend

#### Code Style

- Follow TypeScript naming conventions:
  - `camelCase` for variables and functions
  - `PascalCase` for components and types
  - `UPPERCASE` for constants

- Use ESLint for linting:
  ```bash
  npm run lint
  ```

#### Project Structure

```
frontend/
├── app/                 # Next.js app directory
│   ├── page.tsx        # Main page
│   ├── layout.tsx      # Root layout
│   └── globals.css     # Global styles
├── components/          # React components
│   └── tools/
│       ├── FatLossCalculator.tsx
│       └── N26Analyzer.tsx
├── lib/                 # Utilities
│   └── api/
│       └── client.ts   # API client
└── public/             # Static assets
```

#### Best Practices

1. **TypeScript**: Use strict types, avoid `any`
2. **Components**: Keep components focused and reusable
3. **Hooks**: Follow React hooks rules
4. **Styling**: Use Tailwind CSS classes consistently
5. **State Management**: Keep state close to where it's used
6. **Performance**: Use React.memo, useMemo, useCallback when needed

## Testing

### Backend Tests

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_function_name() {
        // Arrange
        let input = 100.0;
        
        // Act
        let result = your_function(input);
        
        // Assert
        assert_eq!(result, expected_value);
    }
}
```

### Frontend Tests (Future)

When adding frontend tests, use Jest and React Testing Library:
```bash
npm install --save-dev jest @testing-library/react @testing-library/jest-dom
```

## Commit Message Guidelines

Use conventional commits format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(backend): Add rate limiting to API endpoints
fix(frontend): Fix dark mode toggle in calculator
docs: Update README with deployment instructions
style(backend): Format code with rustfmt
refactor(frontend): Extract API client to separate module
test(backend): Add integration tests for N26 analyzer
chore: Update dependencies
```

## Pull Request Process

### Before Submitting

- [ ] Code follows project style guidelines
- [ ] All tests pass
- [ ] No linting errors
- [ ] Documentation updated if needed
- [ ] Commit messages follow convention
- [ ] Branch is up to date with main

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
How was this tested?

## Checklist
- [ ] Tests pass
- [ ] Linting passes
- [ ] Documentation updated
- [ ] Follows coding standards
```

### Review Process

1. **Automated checks** must pass (CI/CD)
2. **At least one approval** from maintainer required
3. **Address feedback** promptly
4. **Squash commits** if requested
5. **Maintainer merges** when ready

## Code Review Guidelines

### As a Reviewer

- Be constructive and respectful
- Explain your reasoning
- Suggest improvements, don't demand
- Approve if changes are acceptable
- Test the changes locally if possible

### As an Author

- Be open to feedback
- Ask questions if unclear
- Make requested changes promptly
- Keep discussions professional
- Thank reviewers for their time

## Adding New Tools

When adding a new tool to the project:

1. **Backend (Rust):**
   - Create module in `backend/src/tools/`
   - Add API handler in `backend/src/api/`
   - Write comprehensive tests
   - Document the API endpoint

2. **Frontend (React):**
   - Create component in `frontend/components/tools/`
   - Add API client function in `frontend/lib/api/client.ts`
   - Update main page to include new tool
   - Follow design guidelines

3. **Documentation:**
   - Update README with tool description
   - Add usage examples
   - Document any configuration needed

## Communication

### Issues

- Use GitHub Issues for bugs, features, and questions
- Search existing issues before creating new ones
- Use issue templates when available
- Provide clear reproduction steps for bugs
- Include screenshots for UI issues

### Discussions

- Use GitHub Discussions for:
  - General questions
  - Feature ideas
  - Architecture discussions
  - Help requests

### Code of Conduct

- Be respectful and inclusive
- Welcome newcomers
- Focus on what's best for the community
- Show empathy towards others
- Accept constructive criticism gracefully

## Release Process

### Versioning

Follow [Semantic Versioning](https://semver.org/):
- MAJOR: Breaking changes
- MINOR: New features (backward compatible)
- PATCH: Bug fixes

### Creating a Release (Maintainers)

1. **Update version numbers:**
   - Update `CHANGELOG.md` with the new version and changes
   - Update version in `backend/Cargo.toml` if needed
   - Update version in `frontend/package.json` if needed

2. **Commit and push changes:**
   ```bash
   git add CHANGELOG.md backend/Cargo.toml frontend/package.json
   git commit -m "chore: Bump version to X.Y.Z"
   git push origin main
   ```

3. **Create and push version tag:**
   ```bash
   git tag -a vX.Y.Z -m "Release version X.Y.Z"
   git push origin vX.Y.Z
   ```

4. **Automated process:**
   - GitHub Actions automatically builds backend and frontend
   - Creates GitHub Release with:
     - Pre-built backend binary (Linux)
     - Frontend production build
     - SHA256 checksums
     - docker-compose.yml
     - Release notes from CHANGELOG.md

5. **Verify release:**
   - Check [Releases page](https://github.com/Ch3fUlrich/Tools/releases)
   - Test download and deployment of artifacts
   - Update deployment documentation if needed

### Release Checklist

- [ ] All tests pass
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] Version numbers bumped
- [ ] Create release notes
- [ ] Tag release in Git

## Resources

- [Rust Book](https://doc.rust-lang.org/book/)
- [Rust by Example](https://doc.rust-lang.org/rust-by-example/)
- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Conventional Commits](https://www.conventionalcommits.org/)

## Questions?

If you have questions:
1. Check existing documentation
2. Search GitHub Issues
3. Ask in GitHub Discussions
4. Contact maintainers

Thank you for contributing to Tools! 🚀
