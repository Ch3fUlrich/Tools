import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import FatLossVisualization from '../components/tools/FatLossVisualization';
import { TestWrapper } from '../lib/test-utils';

describe('FatLossVisualization', () => {
  it('renders static visualization without current point', () => {
    render(<TestWrapper><FatLossVisualization currentKcalDeficit={500} currentWeightLoss={1.0} currentFatLoss={null} currentMuscleLoss={null} /></TestWrapper>);
    expect(screen.getByText(/Fat Loss Visualization/)).toBeInTheDocument();
    // ensure svg exists
    expect(document.querySelector('svg')).toBeTruthy();
  });

  it('renders current point when provided', () => {
    render(<TestWrapper><FatLossVisualization currentKcalDeficit={500} currentWeightLoss={1.0} currentFatLoss={65} currentMuscleLoss={35} /></TestWrapper>);
    expect(screen.getByText(/Your Point/)).toBeInTheDocument();
    expect(screen.getByText(/Fat: 65\.0%/)).toBeInTheDocument();
  });
});
