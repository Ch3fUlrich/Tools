const fs = require('fs');

let content = fs.readFileSync('frontend/vitest.setup.ts', 'utf8');

// The React warning string is usually:
// "An update to %s inside a test was not wrapped in act(...)."
content = content.replace(
  "if (args[0].includes('AuthProvider')) {",
  "if (args[0].includes('AuthProvider') || args[0].includes('wrapped in act')) {"
);

fs.writeFileSync('frontend/vitest.setup.ts', content);
