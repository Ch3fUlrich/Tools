const fs = require('fs');

let content = fs.readFileSync('frontend/vitest.setup.ts', 'utf8');

// The React warning string is usually:
// "An update to %s inside a test was not wrapped in act(...)."
content = content.replace(
  "if (args[0].includes('AuthProvider') || args[0].includes('wrapped in act') || args[0].includes('An update to')) {",
  "if (args[0] && typeof args[0] === 'string' && args[0].includes('An update to')) {"
);

fs.writeFileSync('frontend/vitest.setup.ts', content);
