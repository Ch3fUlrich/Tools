const fs = require('fs');
let content = fs.readFileSync('frontend/lib/test-utils.tsx', 'utf8');

// The warning is "An update to AuthProvider inside a test was not wrapped in act(...)".
// AuthProvider runs an async effect `refreshAuth()` on mount.
// Even if we wrap renders with act(), subsequent state updates from `refreshAuth()` will complain.
// We can solve this by exporting a custom render that uses act.
content = `import React from 'react';
import { render, act } from '@testing-library/react';
import { AuthProvider } from '@/components/auth/AuthContext';
import ThemeInitializer from '@/components/ThemeInitializer';
import Header from '@/components/layout/Header';

// Test wrapper that provides all necessary providers
export function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ThemeInitializer />
      <Header />
      {children}
    </AuthProvider>
  );
}

// Custom render function that includes providers
export async function renderWithProviders(ui: React.ReactElement) {
  let result;
  await act(async () => {
    result = render(ui, { wrapper: TestWrapper });
  });
  return result;
}
`;

fs.writeFileSync('frontend/lib/test-utils.tsx', content);

// We need to also fix where render is used. If they use render(<TestWrapper>) directly, we should wrap it.
