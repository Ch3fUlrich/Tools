import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { RerollIcon } from '../RerollIcon';

describe('RerollIcon', () => {
  it('renders the SVG with default props', () => {
    const { container } = render(<RerollIcon />);
    const svg = container.querySelector('svg');

    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
    expect(svg).toHaveClass('w-5');
    expect(svg).toHaveClass('h-5');
    expect(svg).toHaveClass('text-gray-900');
    expect(svg).toHaveClass('dark:text-white');
  });

  it('applies custom className when provided', () => {
    const customClass = 'custom-test-class';
    const { container } = render(<RerollIcon className={customClass} />);
    const svg = container.querySelector('svg');

    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass(customClass);
    expect(svg).not.toHaveClass('w-5');
  });
});
