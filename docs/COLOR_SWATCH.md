# Design Tokens / Color Swatch

This document lists the design tokens used across the frontend. Tokens are declared as CSS variables in `app/globals.css` and mapped to Tailwind color names in `frontend/tailwind.config.js` so you can use both `var(--accent)` in CSS and `bg-accent` in Tailwind classes.

Tokens

- `--bg` — page background color (light/dark variants)
- `--fg` — main foreground / text color
- `--muted` — muted text
- `--accent` — primary interactive color (used for primary buttons and highlights)
- `--accent-hover` — accent hover state
- `--success` — success green
- `--error` — destructive color

Usage examples

- Tailwind class (via token mapped in `tailwind.config.js`):

```html
<button class="bg-accent hover:bg-accent-hover text-white">Primary</button>
```

- Raw CSS variable usage:

```css
.card { background: var(--bg); color: var(--fg); }
```

If you want to update the palette, prefer editing the values in `app/globals.css` so both Tailwind and raw CSS usages pick up the change.
