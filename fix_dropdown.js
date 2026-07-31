const fs = require('fs');

let content = fs.readFileSync('frontend/__tests__/dropdown.test.tsx', 'utf8');

content = content.replace(
  "import { render, screen, fireEvent } from '@testing-library/react';",
  "import { render, screen, fireEvent, act } from '@testing-library/react';"
);

content = content.replace(
  "render(<TestWrapper><Dropdown items={items} value=\"a\" onChange={onChange} /></TestWrapper>);",
  "await act(async () => { render(<TestWrapper><Dropdown items={items} value=\"a\" onChange={onChange} /></TestWrapper>); });"
);

content = content.replace(
  "it('renders options and calls onChange', () => {",
  "it('renders options and calls onChange', async () => {"
);

fs.writeFileSync('frontend/__tests__/dropdown.test.tsx', content);
