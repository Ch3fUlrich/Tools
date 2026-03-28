/// <reference types="vitest" />
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';

// Mock the API client to focus on FatLossCalculator behavior
vi.mock('@/lib/api/client', () => ({
  calculateFatLoss: vi.fn(),
}));

// Mock visualization to avoid expensive 960-point SVG render in CI
vi.mock('@/components/tools/FatLossVisualization', () => ({
  default: () => null,
  FatLossVisualization: () => null,
}));

import FatLossCalculator from '@/components/tools/FatLossCalculator';

describe('FatLossCalculator extra flows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('opens info tooltip and closes when clicking outside', async () => {
    render(<FatLossCalculator />);

    // open tooltip using the info button by title
    const infoBtn = screen.getByRole('button', { name: /How it works/i });
    fireEvent.click(infoBtn);

    expect(await screen.findByText(/Formula/i)).toBeInTheDocument();

    // simulate clicking outside to close
    fireEvent.mouseDown(document.body);

    await waitFor(() => expect(screen.queryByText(/Formula/i)).not.toBeInTheDocument());
  });

  it('reset button clears inputs', async () => {
    render(<FatLossCalculator />);

    const kcalInput = screen.getByLabelText(/Daily Calorie Deficit/i) as HTMLInputElement;
    const weightInput = screen.getByLabelText(/Weekly Weight Loss/i) as HTMLInputElement;

    fireEvent.change(kcalInput, { target: { value: '500' } });
    fireEvent.change(weightInput, { target: { value: '0.5' } });

    expect(kcalInput.value).toBe('500');
    expect(weightInput.value).toBe('0.5');

    fireEvent.click(screen.getByRole('button', { name: /Reset/i }));

    expect(kcalInput.value).toBe('');
    expect(weightInput.value).toBe('');
  });

  it('renders invalid result message when API returns is_valid: false', async () => {
    const { calculateFatLoss } = await import('@/lib/api/client');
    (calculateFatLoss as any).mockResolvedValueOnce({ fat_loss_percentage: 10, muscle_loss_percentage: 90, is_valid: false });

    render(<FatLossCalculator />);

    fireEvent.change(screen.getByLabelText(/Daily Calorie Deficit/i), { target: { value: '200' } });
    fireEvent.change(screen.getByLabelText(/Weekly Weight Loss/i), { target: { value: '0.2' } });
    fireEvent.click(screen.getByRole('button', { name: /Calculate Composition/i }));

    await waitFor(() => expect(screen.getByText(/Invalid calculation/i)).toBeInTheDocument());
  });

  it('shows results and correct summary when fat loss is between 50-70%', async () => {
    const { calculateFatLoss } = await import('@/lib/api/client');
    (calculateFatLoss as any).mockResolvedValueOnce({ fat_loss_percentage: 60, muscle_loss_percentage: 40, is_valid: true });

    render(<FatLossCalculator />);

    fireEvent.change(screen.getByLabelText(/Daily Calorie Deficit/i), { target: { value: '800' } });
    fireEvent.change(screen.getByLabelText(/Weekly Weight Loss/i), { target: { value: '0.7' } });
    const form = screen.getByRole('button', { name: /Calculate Composition/i }).closest('form') as HTMLFormElement;
    fireEvent.submit(form);

    // Verify calculateFatLoss was called, then check the >50% summary branch
    await waitFor(() => expect(calculateFatLoss).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText(/Good progress/i)).toBeInTheDocument(), { timeout: 5000 });
  });
});
