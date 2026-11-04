import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import MoonIcon from '@/components/icons/MoonIcon';

describe('MoonIcon', () => {
  it('renders with default props', () => {
    const { container } = render(<MoonIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
    expect(svg).toHaveClass('h-5 w-5');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });

  it('accepts custom className', () => {
    const { container } = render(<MoonIcon className="test-class" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('test-class');
    // Ensure default is overridden or at least the custom one is there
    expect(svg).not.toHaveClass('h-5 w-5');
  });

  it('accepts custom style prop', () => {
    // testing for a more standard CSS property output, sometimes JSDOM normalizes
    const { container } = render(<MoonIcon style={{ marginTop: '10px' }} />);
    const svg = container.querySelector('svg');
    // It should render style="margin-top: 10px;"
    expect(svg?.getAttribute('style')).toContain('margin-top: 10px');
  });
});
