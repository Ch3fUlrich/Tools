# UI Redesign TODO (short)

This file lists the immediate tasks for the frontend UI redesign and theming work. It mirrors the larger todo list but is a concise tracking document for the current session.

1. Audit (completed)
   - Inventory files and theming approach. (see `docs/AUDIT.md`)

2. Implement theme toggle (in progress / completed)
   - Set `darkMode: 'class'` in `tailwind.config.js`.
   - Add `.dark` and `.light` CSS variable overrides in `app/globals.css`.
   - Add `frontend/lib/theme.ts` helpers.
   - Add `components/ui/ThemeToggle.tsx` and mount in `app/layout.tsx` with inline init script.

3. Refactor plan
   - Create `components/ui` primitives: Button, Card, Modal, Tooltip.
   - Replace repeated utility class usage in `components/tools/*` with primitives.
   - Migrate charts wrappers to `components/charts` (existing) and add theme-aware styles.

4. Design tokens
   - Define color palette and add to `tailwind.config.js` under `theme.extend.colors`.
   - Produce `docs/COLOR_SWATCH.md`.

5. Animations
   - Centralize animation variants in `frontend/lib/animations.ts`.
   - Respect `prefers-reduced-motion` across components.

6. Tests & CI
   - Add Vitest unit tests for ThemeToggle and Button.
   - Add visual regression or snapshot testing for key pages.

How I will proceed next
- I will now run TypeScript checks and start the dev server (locally) to capture before/after screenshots for `/` and `/auth` and verify theme behavior.
