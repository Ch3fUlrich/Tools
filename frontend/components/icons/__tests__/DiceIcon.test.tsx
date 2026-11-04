import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { DiceIcon } from '../DiceIcon';

describe('DiceIcon', () => {
  it('renders without crashing and has default classes', () => {
    const { container } = render(<DiceIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass('w-4 h-4 text-gray-900 dark:text-white');
  });

  it('applies custom className', () => {
    const { container } = render(<DiceIcon className="custom-class" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('custom-class');
    // Ensure default classes are overwritten since the component does not merge them (it uses className directly)
    expect(svg).not.toHaveClass('w-4');
  });

  it('applies custom style', () => {
    const { container } = render(<DiceIcon style={{ color: 'red' }} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('style', expect.stringContaining('color: red'));
  });
});
