import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import LineChart from '@/components/charts/LineChart';

describe('LineChart', () => {
  it('shows empty state when no data provided', () => {
    render(<LineChart data={[]} />);
    expect(screen.getByText(/No data to display/i)).toBeInTheDocument();
  });

  it('renders SVG and points for valid data and shows title', () => {
    const now = new Date();
    const data = [
      { time: now.toISOString(), value: 10 },
      { time: new Date(now.getTime() + 60 * 60 * 1000).toISOString(), value: 20 },
    ];

    render(<LineChart data={data} title="Test Chart" width={300} height={100} />);

    expect(screen.getByText(/Test Chart/i)).toBeInTheDocument();
    // ensure an svg exists
    const svg = document.querySelector('svg');
    expect(svg).toBeTruthy();
    // Ensure there are circle elements rendered (data points)
    const circles = document.querySelectorAll('circle');
    expect(circles.length).toBeGreaterThanOrEqual(2);
  });
});
