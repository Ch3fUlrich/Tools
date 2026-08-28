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

Available in **English and German** — switch from the header; the choice is remembered.

Two of the tools deliberately have **no backend at all**. The Elterngeld optimizer and the
blood level calculator compute entirely in the browser, so income, tax and health figures
never leave the device. If you are changing those, keep it that way.

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
Models how much of a substance is in the bloodstream over time, using a one-compartment
pharmacokinetic model with first-order absorption and elimination.

**Why this exists:** Knowing when a substance has largely cleared — or when a repeated dose
would stack on top of the last — is useful for scheduling medication, supplements or coffee.

A dose has to be **absorbed** before it can act, so the curve starts at zero, climbs to a
peak at roughly the substance's Tmax, and only then decays:

```
A(t) = Σ  F·Dᵢ · ka/(ka − ke) · ( e^(−ke·(t−tᵢ)) − e^(−ka·(t−tᵢ)) )
```

The **route** and **how long after a meal** the dose was taken both change the curve.
Swallowed nicotine largely does not survive first-pass metabolism (F 30 %) while inhaled
nicotine peaks within minutes (F 80 %, Tmax 0.08 h); food delays gastric emptying, so
ibuprofen taken with lunch peaks about twice as late and lower. Intravenous is the one route
with no absorption phase — it is already in the blood.

**Ethanol gets its own equation.** It has no half-life: alcohol dehydrogenase saturates well
below the concentration of a single drink, so it is cleared at a near-constant rate
(Michaelis-Menten, Vmax 8.5 g/h per 70 kg). Because that is non-linear, separate drinks do
not simply add up, and the whole timeline is integrated numerically instead.

17 substances ship with adult-population half-lives, per-route bioavailability and Tmax, and
a citation for each. The page opens on a worked example — a coffee two hours ago and an
ibuprofen an hour ago — so the contrast between a 5.7 h and a 2 h half-life is visible at a
glance.

**Inputs:** substance, dose (mg), intake time, route, and minutes since eating.
**Output:** a blood-level curve per substance, plus the model and its limits written out.

> Educational tool, not medical or dosing advice. Individual variation is large — caffeine's
> half-life alone spans roughly 2–10 hours.

---

### 💪 Training Tracker
Logs workouts and estimates the mechanical work behind them.

**Why this exists:** Set-and-rep logs tell you volume but not effort. This estimates the
energy of each set from the physics of the movement — the mass actually moved, the
displacement of the bar and of the body segments involved, and the tempo — and maps which
muscles the session loaded.

**Inputs:** exercises, sets, reps, weight, RPE and tempo; body measurements for the segment model.
**Output:** per-set energy, session volume, a muscle-activation heat map and progress charts.

---

### 🍼 Elterngeld Optimizer
Answers one German tax question: is it worth declaring a **higher** profit in the assessment
year, paying more income tax on it, because Elterngeld is calculated from that profit?

**Why this exists:** Elterngeld for a self-employed parent is derived from the profit of the
last completed tax year before the birth (§ 2b Abs. 2 BEEG). Depreciation elections in that
one year therefore have a second, much larger effect that no tax software shows you: they
move the Elterngeld too. The two pull in opposite directions and the balance is not obvious.

It models the § 32a EStG tariff, Ehegattensplitting, the Solidaritätszuschlag, the § 32b
Progressionsvorbehalt, Kindergeld against the Kinderfreibetrag, Mutterschaftsgeld and its
§ 3 BEEG crediting, and whether **filing jointly or separately** costs less in the leave
year. Every rule links to the statute it comes from, and the page shows the equations with
your own figures substituted in.

The single most important input is whether the profit difference is a **timing** difference
(a depreciation election — the same cash either way) or **real extra earnings**. Treating one
as the other overstates the answer several-fold.

**Inputs:** two profit figures, household and partner income, insurance status, leave months.
**Output:** a recommendation with the euro difference, a side-by-side breakdown, the optimum
across the whole profit range, and the reasoning.

> Not tax advice. The binding figure is the one in your Elterngeldbescheid.

---

### 🏦 N26 Transaction Analyzer
Analyzes a JSON export from an N26 bank account and produces a spending breakdown by category.

**Why this exists:** N26's built-in analytics are limited. By exporting your transaction data as JSON and uploading it here, you get category totals, an overall balance, and a full transaction list — all processed securely server-side.

**Inputs:** paste or upload your N26 JSON export.
**Output:** category spending totals, overall balance, and itemized transaction list.

---

### 🧭 Timeline Builder
Builds editable visual timelines with stages, arrows, range blocks, legend groups, and export/import support.

**Why this exists:** Timelines are useful for research summaries, project plans, and comparisons across domains, but they often need exact visual tuning after the first draft. This builder keeps the figure editable in the browser and lets you export the result as image, SVG, PDF, or setup JSON.

**Inputs:** direct editor controls or imported setup JSON.
**Output:** an editable timeline figure with export options.

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
cp .env.example .env     # then edit POSTGRES_PASSWORD and DATABASE_URL
docker compose up -d
```

Open **http://localhost:8080** in your browser.

> The `.env` step is not optional. `docker-compose.yml` refuses to start without
> `POSTGRES_PASSWORD` and `DATABASE_URL` rather than quietly falling back to a placeholder
> password, so you will get
> `required variable DATABASE_URL is missing a value` if you skip it. Published ports are
> bound to `127.0.0.1`, so nothing is reachable from your local network by default.

### Option B — Local development

**Prerequisites:** Node.js 24, pnpm, Rust stable, Docker (for Postgres + Redis)

> **On Windows, install MinGW-w64 first.** The pinned toolchain is
> `x86_64-pc-windows-gnu`, whose `windows-sys` build shells out to `dlltool`. Without it
> every `cargo build`, `cargo test` and `cargo clippy` fails with
> `error calling dlltool 'dlltool.exe': program not found`, and the backend can only be
> checked in CI.
>
> ```powershell
> winget install -e --id BrechtSanders.WinLibs.POSIX.MSVCRT
> ```
>
> MSVCRT, not UCRT — it has to match the `gnu` target's runtime. The installer adds itself
> to your PATH, so open a new shell afterwards.

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
| [SECURITY.md](SECURITY.md) | **Reporting a vulnerability**, what the deployed site can and cannot do, controls in place, known gaps |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Architecture overview, component hierarchy, auth flow, database schema, full file tree |
| [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) | Setup, commands, adding new tools, testing guide, git conventions |
| [docs/TESTING.md](docs/TESTING.md) | Test layout and conventions for both stacks |
| [docs/DOCKER.md](docs/DOCKER.md) | Docker deployment, environment variables, production checklist, CI/CD |
| [docs/SECURITY.md](docs/SECURITY.md) | Internal security guidelines for contributors (the reporting policy is the root [SECURITY.md](SECURITY.md)) |
| [docs/DESIGN.md](docs/DESIGN.md) | UI design principles, color system, component guidelines |
| [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) | How to contribute, PR process, coding standards |
| [CLAUDE.md](CLAUDE.md) | Conventions for AI agents working in this repo — component APIs, MCP setup, known pitfalls |

---

## API Endpoints

```
GET  /api/health                         — health check
POST /api/tools/fat-loss                 — fat loss calculation
POST /api/tools/bloodlevel/calculate     — blood level over time
                                           (intakes take optional `route` and `with_food`)
GET  /api/tools/bloodlevel/substances    — reference substance list
POST /api/tools/dice/roll                — roll dice (CSPRNG)
POST /api/tools/dice/save                — save roll to history
GET  /api/tools/dice/history             — retrieve roll history
POST /api/tools/n26-analyzer             — analyze N26 transactions
GET  /api/auth/config                    — which sign-in methods this deployment accepts
POST /api/auth/register                  — create account (403 unless LOCAL_AUTH_ENABLED)
POST /api/auth/login                     — login (403 unless LOCAL_AUTH_ENABLED; sets sid cookie)
POST /api/auth/logout                    — logout (clears sid cookie)
GET  /api/auth/me                        — get current user profile
PUT  /api/auth/profile                   — update display name
GET  /api/auth/oidc/start                — begin OIDC login
GET  /api/auth/oidc/callback             — OIDC OAuth2 callback (provisions the local user)

Elterngeld optimizer (all require a session):
GET    /api/tools/elterngeld/inputs      — list your saved scenarios
POST   /api/tools/elterngeld/inputs      — save/overwrite a scenario by name
DELETE /api/tools/elterngeld/inputs/{id} — delete one of your scenarios

Training Tracker (all require a session):
GET/POST/DELETE  /api/tools/training/measurements[/latest|/{id}]
GET/POST/PUT/DELETE  /api/tools/training/plans[/{id}]
GET/POST/PUT/DELETE  /api/tools/training/plans/{plan_id}/exercises[/{id}]
GET/POST/PUT/DELETE  /api/tools/training/sessions[/{id}]
GET/POST/PUT/DELETE  /api/tools/training/sessions/{session_id}/sets[/{id}]
GET/POST/PUT/DELETE  /api/tools/training/exercises[/{id}]
GET   /api/tools/training/muscles
POST  /api/tools/training/calculate-energy
POST  /api/tools/training/calculate-plates
GET   /api/tools/training/stats/{energy|volume|muscle-energy}
```

The **Elterngeld Optimizer** has no endpoint at all, and neither does the offline path of the
Blood Level Calculator: both are implemented in `frontend/lib/local/` and run in the browser.
`lib/local/` mirrors `backend/src/tools/` so the frontend still works with no backend
reachable — a test pins the blood level substance list so the two cannot drift.

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
| CI/CD | GitHub Actions (all pinned to commit SHAs), semantic-release, Docker images on GHCR |
| Tests | Vitest 4 + Testing Library (frontend), Rust built-in (backend) |
| i18n | Hand-rolled EN/DE catalogues in `frontend/lib/i18n`, no dependency |
| Fonts | Inter, self-hosted at build time via `next/font` — the export makes no third-party requests |
| Headers | CSP generated per build by `scripts/generate-csp.mjs`, plus HSTS and the usual set |

---

## CI/CD Pipelines

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `ci.yml` | Push/PR to main | Backend + frontend tests, lint, `pnpm audit --prod`, build artifacts |
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
