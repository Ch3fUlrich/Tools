import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import RerollIcon from '@/components/icons/RerollIcon';
import StepperDownIcon from '@/components/icons/StepperDownIcon';

describe('Icons', () => {
  it('renders RerollIcon with default class', () => {
    render(<RerollIcon />);
    // SVGs don't always expose an accessible role; fall back to querying the DOM
    const svg = document.querySelector('svg');
    expect(svg).toBeTruthy();
  });

  it('accepts custom className', () => {
    render(<RerollIcon className="test-class" />);
    const svg = document.querySelector('svg');
    expect(svg).toHaveClass('test-class');
  });
});

describe('StepperDownIcon', () => {
  it('renders StepperDownIcon with default class', () => {
    const { container } = render(<StepperDownIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
    expect(svg).toHaveClass('w-3 h-3');
  });

  it('accepts custom className', () => {
    const { container } = render(<StepperDownIcon className="test-class" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('test-class');
  });
});
