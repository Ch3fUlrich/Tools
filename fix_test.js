const fs = require('fs');

const path = 'frontend/__tests__/auth_components.test.tsx';
let content = fs.readFileSync(path, 'utf8');

// The warning states we are not wrapping state updates inside `act(...)`.
// We should import act from '@testing-library/react'
content = content.replace("import { render, screen, fireEvent, waitFor } from '@testing-library/react';", "import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';");

// Use act around the user interactions
content = content.replace(
  "fireEvent.click(screen.getByText('Login'));\n    await waitFor",
  "act(() => { fireEvent.click(screen.getByText('Login')); });\n    await waitFor"
);

content = content.replace(
  "fireEvent.click(screen.getByText('Logout'));\n\n    await waitFor",
  "act(() => { fireEvent.click(screen.getByText('Logout')); });\n\n    await waitFor"
);

fs.writeFileSync(path, content);
