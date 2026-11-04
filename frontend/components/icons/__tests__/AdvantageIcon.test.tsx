import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AdvantageIcon } from '../AdvantageIcon';

describe('AdvantageIcon', () => {
  it('renders successfully with default className', () => {
    const { container } = render(<AdvantageIcon />);
    const svgElement = container.querySelector('svg');
    expect(svgElement).toBeInTheDocument();
    expect(svgElement).toHaveClass('w-5', 'h-5', 'text-gray-900', 'dark:text-white');
  });

  it('renders successfully with custom className', () => {
    const { container } = render(<AdvantageIcon className="custom-class" />);
    const svgElement = container.querySelector('svg');
    expect(svgElement).toBeInTheDocument();
    expect(svgElement).toHaveClass('custom-class');
    expect(svgElement).not.toHaveClass('w-5'); // it replaces the default className based on component implementation
  });
});
