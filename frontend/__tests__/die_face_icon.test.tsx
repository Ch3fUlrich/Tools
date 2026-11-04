import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { DieFaceIcon } from '@/components/icons/DieFaceIcon';

describe('DieFaceIcon', () => {
  it('renders correctly with default props', () => {
    render(<DieFaceIcon />);
    const el = screen.getByText('D6');
    expect(el).toBeInTheDocument();
    expect(el).toHaveClass('w-6 h-6');
  });

  it('renders correctly with custom sides prop', () => {
    render(<DieFaceIcon sides={20} />);
    const el = screen.getByText('D20');
    expect(el).toBeInTheDocument();
  });

  it('renders correctly with custom className', () => {
    render(<DieFaceIcon className="custom-class" />);
    const el = screen.getByText('D6');
    expect(el).toHaveClass('custom-class');
    expect(el).not.toHaveClass('w-6 h-6'); // It replaces the default since we pass it
  });
});
