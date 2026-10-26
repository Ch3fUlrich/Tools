import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import SunIcon from '@/components/icons/SunIcon';

describe('SunIcon', () => {
  it('renders with default class', () => {
    const { container } = render(<SunIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
    expect(svg).toHaveClass('h-5 w-5');
    expect(svg).toHaveAttribute('fill', 'currentColor');
  });

  it('accepts custom className', () => {
    const { container } = render(<SunIcon className="test-class" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('test-class');
    expect(svg).not.toHaveClass('h-5 w-5'); // Assuming standard React className behavior where it overrides if passed without merging
  });

  it('accepts custom style', () => {
    const { container } = render(<SunIcon style={{ color: 'red' }} />);
    const svg = container.querySelector('svg');
    // For happy-dom/jsdom, when we pass style={{ color: 'red' }},
    // it gets set as style="color: red;".
    expect(svg).toHaveAttribute('style', 'color: red;');
  });
});
