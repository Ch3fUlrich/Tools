/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './lib/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {},
  },
  // Safelist responsive variants to prevent accidental purging of responsive classes
  // (e.g. md:grid-cols-2) which are used in JSX but sometimes omitted by static analysis.
  safelist: [
    // include any responsive prefixed utility via regex
    { pattern: /^(sm|md|lg|xl|2xl):/ },
  ],
  plugins: [],
}
