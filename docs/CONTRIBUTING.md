# Collaboration Guidelines

## Overview

Welcome to the Tools project! This document outlines how to contribute effectively to this open-source project.

## Getting Started

### Prerequisites

**Backend (Rust):**
- Rust stable (currently 1.90.0) — install via [rustup](https://rustup.rs/)
- Cargo (comes with Rust)
- Docker (for Postgres + Redis in local development)

**Frontend (Next.js):**
- Node.js 24+ (required — Vitest 4 + Vite 7 need >= 24)
- pnpm (package manager for the frontend workspace)
- Git

### Initial Setup

1. **Fork the repository** on GitHub
2. **Clone your fork:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/Tools.git
   cd Tools
   ```

3. **Set up the frontend:**
   ```bash
   cd frontend
   pnpm install
   pnpm run build
   ```

4. **Set up the backend:**
   ```bash
   cd backend
   cargo build --locked
   cargo test
   ```

5. **Start supporting services (Postgres + Redis):**
   ```bash
   docker-compose up -d
   ```

## Development Workflow

### Branch Strategy

- `main` — Production-ready code
- `feat/*` — New features
- `fix/*` — Bug fixes
- `refactor/*` — Code refactoring
- `chore/*` — Maintenance tasks

### Creating a Feature

1. **Create a new branch:**
   ```bash
   git checkout -b feat/your-feature-name
   ```

2. **Make your changes** following the guidelines below

3. **Test thoroughly:**
   ```bash
   # Backend
   cd backend
   cargo test
   cargo clippy -- -D warnings
   cargo fmt --check

   # Frontend
   cd frontend
   pnpm run lint
   pnpm test --run
   pnpm run build
   ```

4. **Commit with clear messages:**
   ```bash
   git commit -m "feat(tool-name): add new calculator"
   ```

5. **Push to your fork:**
   ```bash
   git push origin feat/your-feature-name
   ```

6. **Create a Pull Request** on GitHub

## Coding Standards

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

- The `rustfmt.toml` uses only stable-compatible options — no nightly features are required.

#### Project Structure

```
backend/
├── src/
│   ├── main.rs              # Application entry point
│   ├── lib.rs               # Module tree root
│   ├── app.rs               # Axum router setup and route mounting
│   ├── api/                 # HTTP handlers (one file per tool)
│   │   ├── mod.rs
│   │   ├── auth.rs
│   │   ├── bloodlevel.rs
│   │   ├── dice.rs
│   │   ├── dice_history.rs
│   │   ├── fat_loss.rs
│   │   ├── n26_analyzer.rs
│   │   └── oidc.rs
│   ├── tools/               # Business logic (one file per tool)
│   │   ├── mod.rs
│   │   ├── auth.rs
│   │   ├── bloodlevel.rs
│   │   ├── dice.rs
│   │   ├── fat_loss.rs
│   │   ├── n26_analyzer.rs
│   │   └── session.rs
│   ├── middleware/           # Session middleware
│   │   ├── mod.rs
│   │   └── session_middleware.rs
│   └── bin/                 # Additional binaries
│       └── migrate.rs
├── migrations/              # SQL migrations (date-prefixed)
├── tests/                   # Integration tests
├── Cargo.toml
└── Cargo.lock               # Committed — keep in sync
```

> **Note:** `Cargo.lock` is committed to the repository. Always keep it in sync by running `cargo update` when changing dependencies. In CI, builds use `--locked` to ensure reproducibility.

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
6. **Idempotent migrations**: Use `CREATE TABLE IF NOT EXISTS` — never `DROP TABLE` in tests

### TypeScript Frontend

#### Code Style

- Follow TypeScript naming conventions:
  - `camelCase` for variables and functions
  - `PascalCase` for components and types
  - `UPPERCASE` for constants

- Use ESLint for linting:
  ```bash
  pnpm run lint
  ```

- Use `slate-*` Tailwind colors throughout (not `gray-*`) to match the design system.

#### Project Structure

```
frontend/
├── app/                     # Next.js App Router
│   ├── page.tsx             # Home — tool grid
│   ├── layout.tsx           # Root layout
│   ├── globals.css          # CSS custom properties + Tailwind layers
│   └── tools/
│       ├── bloodlevel/      # Blood Level Calculator page
│       ├── dice/            # Dice Roller page
│       ├── fat-loss/        # Fat Loss Calculator page
│       └── n26/             # N26 Transaction Analyzer page
├── components/
│   ├── auth/                # Auth context, forms, guards
│   ├── charts/              # Recharts wrappers (LineChart, Boxplot, Histogram)
│   ├── icons/               # SVG icon components
│   ├── layout/              # Header, Footer, UserControls
│   ├── tools/               # One component per tool + ToolPage wrapper
│   │   ├── BloodLevelCalculator.tsx
│   │   ├── DiceRoller.tsx
│   │   ├── DiceHistory.tsx
│   │   ├── FatLossCalculator.tsx
│   │   ├── FatLossVisualization.tsx
│   │   ├── N26Analyzer.tsx
│   │   └── ToolPage.tsx
│   └── ui/                  # Reusable primitives (Button, Card, CardSection, ErrorAlert, ...)
├── lib/
│   ├── api/client.ts        # All backend API calls — single source of truth
│   ├── animations.ts        # Reusable Tailwind animation class strings
│   ├── theme.ts             # Theme persistence (localStorage + system preference)
│   ├── test-utils.tsx       # TestWrapper for rendering with providers
│   └── types/               # Shared TypeScript types
├── __tests__/               # All Vitest test files
└── vitest.setup.ts          # Global test setup (mocks, localStorage, fetch)
```

#### Best Practices

1. **TypeScript**: Use strict types, avoid `any`
2. **Components**: Keep components focused and reusable
3. **Hooks**: Follow React hooks rules
4. **Styling**: Use Tailwind CSS classes consistently
5. **State Management**: Keep state close to where it's used
6. **Performance**: Use React.memo, useMemo, useCallback when needed
7. **API calls**: Never call `fetch()` directly — use `lib/api/client.ts`
8. **Page headers**: Use the `ToolPage` wrapper — tool components must not render their own `<h1>`
9. **Section cards**: Use `<CardSection>` for titled sections inside tool cards
10. **Error display**: Use `<ErrorAlert>` for error messages

## Testing

### Backend Tests

Unit tests live inside `#[cfg(test)]` blocks in source files. Integration tests live in `backend/tests/` and require `TEST_DATABASE_URL` to be set.

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

```bash
# Unit tests
cargo test

# Integration tests (requires Postgres + Redis)
TEST_DATABASE_URL=postgres://... cargo test
```

Tests run in parallel — avoid shared mutable state and use `CREATE TABLE IF NOT EXISTS` (never `DROP TABLE`).

### Frontend Tests (Vitest + Testing Library)

All frontend tests live in `frontend/__tests__/` and use Vitest 4 with React Testing Library.

```bash
# Run all tests once (CI mode)
pnpm --filter frontend test --run

# Run tests in watch mode
pnpm --filter frontend test
```

Key conventions:

- Every test file must mock `@/lib/api/client` — never hit the real backend:
  ```tsx
  vi.mock('@/lib/api/client', () => ({ myApiCall: vi.fn() }));
  ```
- Render components inside `<TestWrapper>` to get providers:
  ```tsx
  import { TestWrapper } from '@/lib/test-utils';
  ```
- Use `fireEvent.submit(form)` (not `fireEvent.click(button)`) for reliable form submission
- Use `waitFor(..., { timeout: 5000 })` for async UI assertions
- Do not mock localStorage or sessionStorage — `vitest.setup.ts` already stubs them

## Commit Message Guidelines

Commit messages follow the [Conventional Commits](https://www.conventionalcommits.org/) format and are enforced by commitlint in CI. Non-conforming messages will be rejected.

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
feat(backend): add rate limiting to API endpoints
fix(frontend): fix dark mode toggle in calculator
docs: update README with deployment instructions
style(backend): format code with rustfmt
refactor(frontend): extract API client to separate module
test(backend): add integration tests for N26 analyzer
chore(deps): upgrade vitest to 4.x
```

Scope is optional but encouraged. For breaking changes, add `!` after the scope or include `BREAKING CHANGE:` in the commit body.

## Pull Request Process

### Before Submitting

- [ ] Code follows project style guidelines
- [ ] All tests pass (`cargo test` + `pnpm test --run`)
- [ ] No linting errors (`cargo clippy -- -D warnings` + `pnpm run lint`)
- [ ] `cargo fmt --check` passes
- [ ] Documentation updated if needed
- [ ] Commit messages follow conventional commits format
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
   - Create business logic module in `backend/src/tools/`
   - Add API handler in `backend/src/api/`
   - Register in `src/api/mod.rs` and mount the route in `src/app.rs`
   - Add SQL migration in `migrations/` if a database table is needed
   - Write comprehensive tests

2. **Frontend (React):**
   - Create component in `frontend/components/tools/MyTool.tsx` (client component, no `<h1>`)
   - Create page in `frontend/app/tools/my-tool/page.tsx` using the `ToolPage` wrapper
   - Add API client function in `frontend/lib/api/client.ts`
   - Add the tool to the `tools` array in `frontend/app/page.tsx`
   - Write tests in `frontend/__tests__/mytool.test.tsx`

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

The project follows [Semantic Versioning](https://semver.org/):
- MAJOR: Breaking changes
- MINOR: New features (backward compatible)
- PATCH: Bug fixes

Releases are fully automated via [semantic-release](https://github.com/semantic-release/semantic-release). When commits land on `main`, semantic-release analyzes the conventional commit messages, determines the next version, creates a GitHub Release with auto-generated release notes, and tags the commit. No manual CHANGELOG updates or version bumps are needed.

### What You Need to Do

- Write clear conventional commit messages (semantic-release reads these to decide the version bump)
- Ensure CI passes before merging to `main`

That's it — the rest is handled automatically.

## Resources

- [Rust Book](https://doc.rust-lang.org/book/)
- [Rust by Example](https://doc.rust-lang.org/rust-by-example/)
- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/docs/react-testing-library/intro)
- [Conventional Commits](https://www.conventionalcommits.org/)

## Questions?

If you have questions:
1. Check existing documentation
2. Search GitHub Issues
3. Ask in GitHub Discussions
4. Contact maintainers

Thank you for contributing to Tools!
