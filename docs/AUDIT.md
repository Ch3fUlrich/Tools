# Frontend Audit (summary)

Date: 2025-10-25

This document summarizes the findings from a quick audit of the `frontend/` app to prepare for the UI redesign and theming work.

Overview
- Framework: Next.js (app router) with TypeScript and Tailwind CSS
- Styling: Tailwind + custom CSS variables in `app/globals.css`.
- Animations: CSS keyframes and small helpers; no framer-motion dependency.

Key locations
- `frontend/app/` — `layout.tsx`, `page.tsx`, `globals.css`
- `frontend/components/`
  - `auth/` — authentication components
  - `tools/` — tool pages/components (DiceRoller, FatLoss, etc.)
  - `charts/`, `icons/`
  - `ui/` — currently only `ClientOnly.tsx`; we'll add shared primitives here
- `frontend/lib/` — `api/`, `types/` and newly added `theme.ts`
- `frontend/tailwind.config.js` — content globs present; darkMode updated to `class`.

Current theming
- The app used `:root` variables plus `@media (prefers-color-scheme: dark)` to provide dark mode.
- No persisted user theme toggle existed; theme was entirely OS-driven.

Risks and notes
- Switching Tailwind to `darkMode: 'class'` is necessary to provide a user toggle. We added support for `.dark` and `.light` classes while keeping `prefers-color-scheme` as a fallback.
- There are many project-specific Tailwind utilities defined in `globals.css` (e.g., `btn-primary`, `tool-card`), which should be gradually migrated into component primitives under `components/ui`.
- Moving files will require careful import updates. The repo uses `@/...` aliases in imports; after moves, run `npx tsc --noEmit` to find broken imports.

Immediate next steps (done in this iteration)
1. Enable class-based dark mode in `tailwind.config.js`.
2. Add `.dark` and `.light` CSS variable blocks in `app/globals.css` (keeps media query fallback).
3. Add a small inline script in `app/layout.tsx` to initialize theme before hydration to avoid FOUC.
4. Add `frontend/lib/theme.ts` helper and a `components/ui/ThemeToggle.tsx` client component.

Longer-term recommendations
- Create `components/ui/` primitives (Button, Card, Modal, Table) and migrate repeated utility usage to these primitives.
- Add a `docs/COLOR_SWATCH.md` describing the design tokens and usage guidelines.
- Introduce a11y and performance checks (Lighthouse, axe) and add tests for ThemeToggle and primitives.
