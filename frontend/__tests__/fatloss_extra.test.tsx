/// <reference types="vitest" />
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';

// Mock the API client and the visualization component to focus on FatLossCalculator behavior
vi.mock('@/lib/api/client', async () => ({
  calculateFatLoss: vi.fn(),
}));

vi.mock('@/components/tools/FatLossVisualization', () => ({ __esModule: true, default: () => <div>MockViz</div> }));

import FatLossCalculator from '@/components/tools/FatLossCalculator';

describe('FatLossCalculator extra flows', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('opens info tooltip and closes when clicking outside', async () => {
    render(<FatLossCalculator />);

    // open tooltip using the info button by title
    const infoBtn = screen.getByRole('button', { name: /Information about calculation method and sources/i });
    fireEvent.click(infoBtn);

    expect(await screen.findByText(/Calculation Method/i)).toBeInTheDocument();

    // simulate clicking outside to close
    fireEvent.mouseDown(document.body);

    await waitFor(() => expect(screen.queryByText(/Calculation Method/i)).not.toBeInTheDocument());
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

  it('shows visualization component when result is valid', async () => {
    const { calculateFatLoss } = await import('@/lib/api/client');
    (calculateFatLoss as any).mockResolvedValueOnce({ fat_loss_percentage: 60, muscle_loss_percentage: 40, is_valid: true });

    render(<FatLossCalculator />);

    fireEvent.change(screen.getByLabelText(/Daily Calorie Deficit/i), { target: { value: '800' } });
    fireEvent.change(screen.getByLabelText(/Weekly Weight Loss/i), { target: { value: '0.7' } });
    fireEvent.click(screen.getByRole('button', { name: /Calculate Composition/i }));

    // Visualization is mocked to a simple div labeled MockViz
    await waitFor(() => expect(screen.getByText('MockViz')).toBeInTheDocument());

    // Also check the summary branch for >50% fat_loss
    expect(screen.getByText(/Good progress! Focus on maintaining muscle mass/i)).toBeInTheDocument();
  });
});
