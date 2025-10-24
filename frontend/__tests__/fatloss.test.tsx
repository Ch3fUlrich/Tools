/// <reference types="vitest" />
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FatLossCalculator from '@/components/tools/FatLossCalculator';

import { vi } from 'vitest';

vi.mock('@/lib/api/client', async () => ({
  calculateFatLoss: vi.fn(),
}));

describe('FatLossCalculator', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('shows results on successful calculation', async () => {
    const { calculateFatLoss } = await import('@/lib/api/client');
    (calculateFatLoss as any).mockResolvedValueOnce({ fat_loss_percentage: 80, muscle_loss_percentage: 20, is_valid: true });

    render(<FatLossCalculator />);

  fireEvent.change(screen.getByLabelText(/Calorie Deficit/i), { target: { value: '3500' } });
  fireEvent.change(screen.getByLabelText(/Weight Loss/i), { target: { value: '1' } });
  fireEvent.click(screen.getByRole('button', { name: /Calculate/i }));

  await waitFor(() => expect(screen.getByText(/Results:/)).toBeInTheDocument());
  expect(screen.getByText(/80.00%/)).toBeInTheDocument();
  });

  it('shows error message when calculation fails', async () => {
    const { calculateFatLoss } = await import('@/lib/api/client');
    (calculateFatLoss as any).mockRejectedValueOnce(new Error('server error'));

    render(<FatLossCalculator />);

  fireEvent.change(screen.getByLabelText(/Calorie Deficit/i), { target: { value: '0' } });
  fireEvent.change(screen.getByLabelText(/Weight Loss/i), { target: { value: '0' } });
  fireEvent.click(screen.getByRole('button', { name: /Calculate/i }));

  await waitFor(() => expect(screen.getByText(/Failed to calculate/)).toBeInTheDocument());
  });
});
