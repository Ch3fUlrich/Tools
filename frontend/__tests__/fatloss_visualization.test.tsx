import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import FatLossVisualization from '../components/tools/FatLossVisualization';

describe('FatLossVisualization', () => {
  it('renders static visualization without current point', () => {
    render(<FatLossVisualization currentKcalDeficit={500} currentWeightLoss={1.0} currentFatLoss={null} currentMuscleLoss={null} />);
    expect(screen.getByText(/Fat Loss Visualization/)).toBeInTheDocument();
    // ensure svg exists
    expect(document.querySelector('svg')).toBeTruthy();
  });

  it('renders current point when provided', () => {
    render(<FatLossVisualization currentKcalDeficit={500} currentWeightLoss={1.0} currentFatLoss={65} currentMuscleLoss={35} />);
    expect(screen.getByText(/Your Point/)).toBeInTheDocument();
    expect(screen.getByText(/Fat: 65.0%/i)).toBeInTheDocument();
  });
});
