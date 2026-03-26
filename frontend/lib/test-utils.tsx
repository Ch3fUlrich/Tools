import React, { ReactNode } from 'react';
import { render } from '@testing-library/react';
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
export function renderWithProviders(ui: React.ReactElement) {
  return render(ui, { wrapper: TestWrapper });
}