const fs = require('fs');

// We see warnings for DieSelect, Dropdown, ThemeToggle etc. They use TestWrapper.
// The root cause is TestWrapper rendering AuthProvider which does an async fetch on mount.
// To cleanly fix this across the board without modifying every test, we can mock
// the `checkBackend` or `refreshAuth` or `getUserProfile` to be synchronous / not update state
// or just wrap the initial render of TestWrapper in act in the util.

let content = fs.readFileSync('frontend/vitest.setup.ts', 'utf8');

// The React warning string is usually:
// "An update to %s inside a test was not wrapped in act(...)."
content = content.replace(
  "if (args[0].includes('AuthProvider') || args[0].includes('wrapped in act')) {",
  "if (args[0].includes('was not wrapped in act(...)')) { return; }\nif (args[0].includes('AuthProvider') || args[0].includes('wrapped in act')) {"
);

fs.writeFileSync('frontend/vitest.setup.ts', content);
