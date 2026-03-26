/// <reference types="vitest" />
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FatLossCalculator from '@/components/tools/FatLossCalculator';

import { vi } from 'vitest';

vi.mock('@/lib/api/client', () => ({
  calculateFatLoss: vi.fn(),
}));

// Mock AuthContext
vi.mock('@/components/auth/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: true, isLoading: false }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

import { TestWrapper } from '@/lib/test-utils';

describe('FatLossCalculator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows results on successful calculation', async () => {
    const { calculateFatLoss } = await import('@/lib/api/client');
    (calculateFatLoss as any).mockResolvedValueOnce({ fat_loss_percentage: 80, muscle_loss_percentage: 20, is_valid: true });

    render(<TestWrapper><FatLossCalculator /></TestWrapper>);

  fireEvent.change(screen.getByLabelText(/Daily Calorie Deficit/i), { target: { value: '3500' } });
  fireEvent.change(screen.getByLabelText(/Weekly Weight Loss/i), { target: { value: '1' } });
  fireEvent.click(screen.getByRole('button', { name: /Calculate Composition/i }));

  await waitFor(() => expect(calculateFatLoss).toHaveBeenCalledWith({
    kcal_deficit: 3500,
    weight_loss_kg: 1,
  }));

  await waitFor(() => expect(screen.getByText(/Body Composition Results/)).toBeInTheDocument());
  // Check that the fat loss percentage appears in the results (should be unique in context)
  expect(screen.getByText('80.0%')).toBeInTheDocument();
  });

  it('shows error message when calculation fails', async () => {
    const { calculateFatLoss } = await import('@/lib/api/client');
    (calculateFatLoss as any).mockRejectedValueOnce(new Error('server error'));

    render(<TestWrapper><FatLossCalculator /></TestWrapper>);

  fireEvent.change(screen.getByLabelText(/Daily Calorie Deficit/i), { target: { value: '0' } });
  fireEvent.change(screen.getByLabelText(/Weekly Weight Loss/i), { target: { value: '0' } });
  fireEvent.click(screen.getByRole('button', { name: /Calculate Composition/i }));

  await waitFor(() => expect(screen.getByText(/server error/)).toBeInTheDocument());
  });
});
