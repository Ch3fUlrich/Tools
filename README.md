# Tools Collection

[![CI](https://github.com/Ch3fUlrich/Tools/actions/workflows/ci.yml/badge.svg)](https://github.com/Ch3fUlrich/Tools/actions/workflows/ci.yml)
[![Integration Tests](https://github.com/Ch3fUlrich/Tools/actions/workflows/integration-tests.yml/badge.svg)](https://github.com/Ch3fUlrich/Tools/actions/workflows/integration-tests.yml)
[![Deploy to GitHub Pages](https://github.com/Ch3fUlrich/Tools/actions/workflows/gh-pages.yml/badge.svg)](https://github.com/Ch3fUlrich/Tools/actions/workflows/gh-pages.yml)
[![codecov](https://codecov.io/gh/Ch3fUlrich/Tools/branch/main/graph/badge.svg)](https://codecov.io/gh/Ch3fUlrich/Tools)
[![GitHub Pages](https://img.shields.io/badge/demo-GitHub%20Pages-blue)](https://ch3fulrich.github.io/Tools/)
[![Docker backend](https://ghcr-badge.egpl.dev/ch3fulrich/tools-backend/size?color=blue&tag=latest&label=backend)](https://github.com/Ch3fUlrich/Tools/pkgs/container/tools-backend)
[![Docker frontend](https://ghcr-badge.egpl.dev/ch3fulrich/tools-frontend/size?color=blue&tag=latest&label=frontend)](https://github.com/Ch3fUlrich/Tools/pkgs/container/tools-frontend)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A collection of practical web tools built on a **Rust/Axum backend** and a **Next.js 16 frontend**. The site works as a static demo on GitHub Pages and gains full functionality (history, authentication, server-side calculations) when connected to a backend.

---

## Tools

### 🎲 Dice Roller
Roll dice for tabletop games and simulations. Supports:
- All standard die types: d2, d3, d4, d6, d8, d10, d12, d20, and custom-sided dice
- Multiple independent dice configurations in a single roll
- Advantage and disadvantage modifiers per die
- Targeted rerolls (e.g., reroll any result below 3)
- Statistical charts: boxplot and histogram across multiple rolls
- Roll history — persisted to your browser locally; synced to the server when you log in

The dice are rolled server-side using a cryptographically secure RNG, preventing client tampering.

---

### 🏋️ Fat Loss Calculator
Estimates the split between fat loss and muscle loss for a given calorie deficit and weight change.

**Why this exists:** When losing weight, not all loss is fat — some is muscle. The ratio depends on how aggressive the deficit is. This calculator uses well-established constants (1 kg fat ≈ 7,000 kcal stored energy; 1 kg muscle ≈ 1,200 kcal) to estimate what fraction of your weight loss came from each tissue.

**Inputs:** weekly calorie deficit (kcal) and total weight lost (kg).
**Output:** percentage of loss from fat vs muscle, with a body composition chart.

---

### 🧪 Blood Level Calculator
Models how a substance's concentration in the bloodstream changes over time using pharmacokinetic (PK) half-life decay.

**Why this exists:** Understanding when a substance has largely cleared your system — or when a repeated dose would stack — is useful for scheduling medications, supplements, or caffeine. This tool uses the standard first-order elimination model.

**Inputs:** substance (choose from a reference list or enter a half-life), dosage (mg), intake time, and intake type (fasted/fed).
**Output:** a blood-level graph showing concentration over time for one or multiple substances.

---

### 🏦 N26 Transaction Analyzer
Analyzes a JSON export from an N26 bank account and produces a spending breakdown by category.

**Why this exists:** N26's built-in analytics are limited. By exporting your transaction data as JSON and uploading it here, you get category totals, an overall balance, and a full transaction list — all processed securely server-side.

**Inputs:** paste or upload your N26 JSON export.
**Output:** category spending totals, overall balance, and itemized transaction list.

---

## Quick Start

### Option A — Docker (recommended)

Pre-built images are published to GitHub Container Registry on every release and are freely downloadable without authentication:

```bash
# Pull images directly (no login required — packages are public)
docker pull ghcr.io/ch3fulrich/tools-backend:latest
docker pull ghcr.io/ch3fulrich/tools-frontend:latest
```

Or clone and run the full stack with Docker Compose:

```bash
git clone https://github.com/Ch3fUlrich/Tools.git
cd Tools
docker compose up -d
```

Open **http://localhost:8080** in your browser.

### Option B — Local development

**Prerequisites:** Node.js 24, pnpm, Rust stable, Docker (for Postgres + Redis)

```bash
git clone https://github.com/Ch3fUlrich/Tools.git
cd Tools

# Install frontend dependencies
pnpm install

# Start the full development stack (services, backend, and frontend)
# This works seamlessly on both Linux and Windows.
pnpm run dev
```
Open **http://localhost:3000** in your browser.

### Option C — GitHub Pages demo (no backend)

Visit **https://ch3fulrich.github.io/Tools/** to see the current build of the frontend. Tools that require a backend show a connection banner — you can connect your own backend via the `NEXT_PUBLIC_API_URL` environment variable when building locally.

---

## Documentation

| Document | Contents |
|----------|----------|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Architecture overview, component hierarchy, auth flow, database schema, full file tree |
| [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) | Setup, commands, adding new tools, testing guide, git conventions |
| [docs/DOCKER.md](docs/DOCKER.md) | Docker deployment, environment variables, production checklist, CI/CD |
| [docs/SECURITY.md](docs/SECURITY.md) | Security policy, vulnerability reporting |
| [docs/DESIGN.md](docs/DESIGN.md) | UI design principles, color system, component guidelines |
| [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) | How to contribute, PR process, coding standards |

---

## API Endpoints

```
GET  /api/health                         — health check
POST /api/tools/fat-loss                 — fat loss calculation
POST /api/tools/bloodlevel/calculate     — blood level over time
GET  /api/tools/bloodlevel/substances    — reference substance list
POST /api/tools/dice/roll                — roll dice (CSPRNG)
POST /api/tools/dice/save                — save roll to history
GET  /api/tools/dice/history             — retrieve roll history
POST /api/tools/n26-analyzer             — analyze N26 transactions
POST /api/auth/register                  — create account
POST /api/auth/login                     — login (sets sid cookie)
POST /api/auth/logout                    — logout (clears sid cookie)
GET  /api/auth/me                        — get current user profile
PUT  /api/auth/profile                   — update display name
GET  /api/auth/oidc/start                — begin OIDC login
GET  /api/auth/oidc/callback             — OIDC OAuth2 callback
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4 |
| Backend | Rust, Axum 0.7, SQLx |
| Database | PostgreSQL 16 |
| Cache / Sessions | Redis 7 |
| Frontend runtime | nginx-unprivileged (Alpine, rootless) |
| Backend runtime | distroless/static (musl-linked, ~2 MB) |
| CI/CD | GitHub Actions, semantic-release, Docker images on GHCR |
| Tests | Vitest 4 + Testing Library (frontend), Rust built-in (backend) |

---

## CI/CD Pipelines

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `ci.yml` | Push/PR to main | Backend + frontend tests, build artifacts |
| `integration-tests.yml` | After CI succeeds | Full stack tests with Postgres + Redis |
| `frontend.yml` | Changes to `frontend/` | Tests, lint, build, Codecov upload |
| `backend.yml` | Changes to `backend/` | Cargo test, clippy, fmt |
| `gh-pages.yml` | Push to main | Build and deploy static site to GitHub Pages |
| `release.yml` | After CI succeeds on main | Semantic-release versioning (conventional commits) |
| `publish-on-ci-success.yml` | On GitHub Release published | Build and push Docker images to GHCR |
| `cargo-audit.yml` | Weekly + Cargo changes | Dependency security audit |
| `commitlint.yml` | PRs | Validate conventional commit messages |
| `automerge-dependabot.yml` | Dependabot PRs | Auto-merge patch/minor updates |

---

## License

[MIT License](LICENSE) — free to use, modify, and distribute.
