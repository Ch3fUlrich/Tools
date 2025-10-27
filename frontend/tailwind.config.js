/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './pages/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        accent: 'var(--accent)',
        'accent-hover': 'var(--accent-hover)',
        bg: 'var(--bg)',
        fg: 'var(--fg)',
        muted: 'var(--muted)',
        success: 'var(--success)',
        error: 'var(--error)',
      },
      backdropBlur: {
        sm: '4px',
      }
    },
  },
  plugins: [],
};
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,html}',
    './components/**/*.{js,ts,jsx,tsx,html}',
    './lib/**/*.{js,ts,jsx,tsx,html}',
    './src/**/*.{js,ts,jsx,tsx,rs,html}',
    '../**/*.{rs,html}',
    './**/*.{rs,html}',
  ],
  // Keep content paths wide enough to scan Rust templates and generated HTML.
  // Removing safelist to simplify config; re-add only if needed.
  // Use the `class` strategy so we can toggle theme via `document.documentElement.classList`
  darkMode: 'class',
  theme: {
    extend: {
      // keep empty for now; we'll add color tokens later under Design & tokens
    },
  },
  plugins: [],
}
