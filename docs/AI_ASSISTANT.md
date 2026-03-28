# AI Assistant Guide

This document explains the Claude Code tooling set up for this repository — what was created, why, and how to use it.

---

## Overview

Three complementary layers help Claude work faster and more accurately in this codebase:

| Layer | Where | Purpose |
|---|---|---|
| **CLAUDE.md** (project instructions) | `/CLAUDE.md` | Loaded automatically at session start — rules, patterns, file locations |
| **`tools-repo` skill** | Claude config dir | Compact quick-reference loaded into context on demand |
| **`/new-tool` slash command** | `.claude/commands/new-tool.md` | Step-by-step scaffold for adding a new tool |

---

## 1. CLAUDE.md — Project Instructions

Loaded automatically whenever you open this repo in Claude Code.

Contains the authoritative set of conventions Claude must follow:

- Architecture patterns (ToolPage wrapper, CardSection sections, ErrorAlert, api/client.ts)
- "Do not do these" anti-patterns (no `<h1>` in tool components, no `gray-*`, no inline fetch, etc.)
- Full key-files quick reference table
- Testing conventions (TestWrapper, fireEvent.submit, waitFor timeouts)
- Git commit message format (Conventional Commits, enforced by commitlint)
- CI/CD workflow table

**Additional sections added for AI navigation speed:**

### Component API Quick Reference

Exact prop signatures for every reusable component so Claude doesn't have to open each file:

```
ToolPage:      title* description emoji gradientFrom gradientTo children*
CardSection:   title* gradient* children* className delay
ErrorAlert:    error (string | Error)
Button:        variant('primary'|'ghost'|'success'|'default')
NumberInput:   id value* onChange* step min placeholder unit className ariaLabel
Counter:       value* min max onChange*
ModernCheckbox: id checked onChange label className ariaLabel
```

### CSS Utility Classes Reference

Every semantic CSS class defined in `globals.css`, grouped by category:

- **Buttons**: `btn-primary`, `btn-ghost`, `btn-success`, `btn-danger`, `btn-icon`, `remove-btn`, `op-btn`, `die-btn`
- **Inputs**: `form-input`, `form-input h-12`, `form-input--compact`
- **Animations**: `animate-fade-in-up`, `animate-scale-in`, `spinner`
- **Popups**: `popup-panel` — always use this for popups/tooltips (solid background, correct border/shadow)
- **Navigation**: `nav-item`, `btn-nav`, `nav-emoji`, `nav-label`

### CSS Variables Reference

All variables grouped by category with light/dark values so Claude picks the right one without reading globals.css:

- Background: `--bg`, `--bg-secondary`, `--card-bg` (⚠️ near-transparent in dark mode)
- Text: `--fg`, `--muted`, `--accent`
- Components: `--card-border`, `--shadow-soft`, `--input-bg`, `--input-border`
- Semantic: `--success`, `--error`, `--warning`

### Copy-Paste Patterns

Ready-to-use code blocks for:
- Tool component skeleton (full state management, CardSection, ErrorAlert, loading spinner)
- Popup/tooltip with click-outside handler
- SVG icon sizing (both HTML attrs + inline style required in Tailwind v4)
- Close button (position:absolute top-right, parent needs position:relative)
- Test file boilerplate (vi.mock, TestWrapper, waitFor)

### Add New Tool — Full Checklist

12 items covering all required file changes (7 frontend + 5 backend). The most commonly missed item is **Header.tsx** — both desktop nav and mobile dropdown must be updated.

### Colour Palette

Table of existing tool gradients + available ones with exact hex values and glowColor formula.

---

## 2. `tools-repo` Skill

A Claude skill is a compact reference document that Claude loads into context when it detects a matching task — letting it answer questions about the repo without spending tokens searching files first.

**When it activates:** Any mention of working on the Tools repo, adding a tool, fixing styling/theming, updating components, or referencing specific files/components by name.

**What it contains (concise version of CLAUDE.md's key sections):**

- Project fingerprint (stack versions, Node requirement)
- 9 golden rules
- Key file locations table
- Button/input/animation CSS class list
- Most-used CSS variables
- Common copy-paste patterns (popup, close button, test boilerplate)
- Commands
- PR merge workflow (branch protection bypass)
- 12-item new tool checklist
- Colour palette

**Why it exists:** Reading files costs tokens and time. With the skill in context, Claude can answer "what CSS class do I use for a popup?" or "which files do I need to update for a new tool?" instantly, without opening any files. In benchmarking, skill-aided runs answered the new-tool checklist question with 100% accuracy vs 50% without the skill — the key difference being the Header.tsx desktop+mobile requirement that's easy to miss.

**Location of the .skill file:**
```
C:\Users\mauls\AppData\Roaming\Claude\local-agent-mode-sessions\skills-plugin\...\skills\skill-creator\tools-repo.skill
```

Install by dragging the `.skill` file into a Claude Code session or via the skills panel.

---

## 3. `/new-tool` Slash Command

**Location:** `.claude/commands/new-tool.md`

**Usage:**
```
/new-tool <ToolName> <emoji> <gradient-color> <description>
```

**Examples:**
```
/new-tool UnitConverter 🔄 cyan "Convert between metric and imperial units"
/new-tool TimerTool ⏱️ amber "Count down or measure elapsed time"
```

### What it does

Executes 6 steps automatically:

1. **Derives values** — slug (kebab-case), component name (PascalCase), gradient from palette
2. **Backend files** — creates `backend/src/tools/<slug>.rs` and `backend/src/api/<slug>.rs` with full Rust struct templates; registers in `mod.rs` and mounts route in `app.rs`
3. **Frontend files** — creates the tool component (using CardSection + ErrorAlert skeleton), the Next.js page (ToolPage wrapper), adds to the home page grid, adds both desktop nav and mobile dropdown links in Header.tsx
4. **Adds to `client.ts`** — typed request/response interfaces + async function
5. **Writes test** — vi.mock, TestWrapper, basic render + success + error cases
6. **Verifies and commits** — runs `pnpm --filter frontend test --run`, then commits and pushes on a feature branch

### Why it was created

Adding a new tool requires touching 12 files across frontend and backend. Missing even one (especially Header.tsx) results in a tool that's either unreachable from navigation or breaks CI. The slash command encodes the full checklist so nothing gets skipped.

---

## Common Pitfalls (AI and Human)

These are the most frequent mistakes — the instructions and skill both guard against them:

| Pitfall | Correct approach |
|---|---|
| Using `dark:` Tailwind classes for colors | Always `var(--fg)`, `var(--accent)`, etc. |
| Using `gray-*` color classes | `slate-*` only |
| Popup background invisible in dark mode | `--card-bg` is near-transparent; use `.popup-panel` class |
| Close button anchors to viewport | Parent needs `position: relative` |
| SVG renders at 300px | Set both HTML `width`/`height` attrs AND `style={{width,height}}` |
| Adding `<h1>` in tool component | `ToolPage` owns the h1 |
| Calling `fetch()` in a component | All calls go through `lib/api/client.ts` |
| Duplicating error/section markup | Use `<ErrorAlert>` and `<CardSection>` |
| Forgetting Header.tsx when adding a tool | Update both desktop nav AND mobile dropdown |
| Using `gray-*` not `slate-*` | Use `slate-*` throughout |

---

## Files Modified/Created

| File | Change |
|---|---|
| `/CLAUDE.md` | Added Component API, CSS classes, CSS variables, copy-paste patterns, new tool checklist, PR workflow, colour palette |
| `/.claude/commands/new-tool.md` | New slash command for scaffolding tools |
| `/docs/AI_ASSISTANT.md` | This file |
