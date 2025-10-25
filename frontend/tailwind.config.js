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
  theme: {
    extend: {},
  },
  plugins: [],
}
