/// <reference types="vitest" />
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FatLossCalculator from '@/components/tools/FatLossCalculator';

import { vi } from 'vitest';

vi.mock('@/lib/api/client', () => ({
  calculateFatLoss: vi.fn(),
}));

// Mock visualization to avoid expensive 960-point SVG render in CI
vi.mock('@/components/tools/FatLossVisualization', () => ({
  default: () => null,
  FatLossVisualization: () => null,
}));

describe('FatLossCalculator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows results on successful calculation', async () => {
    const { calculateFatLoss } = await import('@/lib/api/client');
    (calculateFatLoss as any).mockResolvedValueOnce({ fat_loss_percentage: 80, muscle_loss_percentage: 20, is_valid: true });

    render(<FatLossCalculator />);

    fireEvent.change(screen.getByLabelText(/Daily Calorie Deficit/i), { target: { value: '3500' } });
    fireEvent.change(screen.getByLabelText(/Weekly Weight Loss/i), { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: /Calculate Composition/i }));

    await waitFor(() => expect(calculateFatLoss).toHaveBeenCalledWith({
      kcal_deficit: 3500,
      weight_loss_kg: 1,
    }));

    await waitFor(() => expect(screen.getByText(/Body Composition Results/)).toBeInTheDocument());
    expect(screen.getByText('80.0%')).toBeInTheDocument();
  });

  it('shows error message when calculation fails', async () => {
    const { calculateFatLoss } = await import('@/lib/api/client');
    (calculateFatLoss as any).mockRejectedValueOnce(new Error('server error'));

    render(<FatLossCalculator />);

    fireEvent.change(screen.getByLabelText(/Daily Calorie Deficit/i), { target: { value: '0' } });
    fireEvent.change(screen.getByLabelText(/Weekly Weight Loss/i), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: /Calculate Composition/i }));

    await waitFor(() => expect(screen.getByText(/server error/)).toBeInTheDocument());
  });
});
