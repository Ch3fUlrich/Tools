import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import Boxplot from '@/components/charts/Boxplot';
import Histogram from '@/components/charts/Histogram';

describe('Chart components', () => {
  it('shows No data when Boxplot receives empty values and renders svg when data present', () => {
    const { rerender } = render(<Boxplot values={[]} />);
    expect(screen.getByText(/No data/i)).toBeInTheDocument();

    rerender(<Boxplot values={[1,2,3,4]} />);
    expect(screen.getByTestId('boxplot')).toBeInTheDocument();
  });

  it('shows No data when Histogram receives empty values and renders svg when data present', () => {
    const { rerender } = render(<Histogram values={[]} />);
    expect(screen.getByText(/No data/i)).toBeInTheDocument();

    rerender(<Histogram values={[2,4,6]} />);
    expect(screen.getByTestId('histogram')).toBeInTheDocument();
  });
});
