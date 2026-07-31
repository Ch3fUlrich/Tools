const fs = require('fs');

const path = 'frontend/lib/test-utils.tsx';
let content = fs.readFileSync(path, 'utf8');

if (!content.includes('import { act }')) {
  // Try finding and replacing the react import
  if (content.includes("import { ReactNode } from 'react';")) {
     content = content.replace("import { ReactNode } from 'react';", "import React, { ReactNode } from 'react';");
     content = `import { act } from '@testing-library/react';\n` + content;
  }
}
fs.writeFileSync(path, content);
