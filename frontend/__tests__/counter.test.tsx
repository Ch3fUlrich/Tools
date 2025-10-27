import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import Counter from '@/components/ui/Counter';

describe('Counter', () => {
  it('calls onChange when increment/decrement clicked', () => {
    const onChange = vi.fn();
    render(<Counter value={5} onChange={onChange} min={0} max={10} />);

    const dec = screen.getByLabelText('decrement');
    const inc = screen.getByLabelText('increment');

    fireEvent.click(dec);
    expect(onChange).toHaveBeenCalledWith(4);

    fireEvent.click(inc);
    expect(onChange).toHaveBeenCalledWith(6);
  });

  it('commits input value on blur and enter', () => {
    const onChange = vi.fn();
    render(<Counter value={2} onChange={onChange} min={0} max={5} />);
    const input = screen.getByLabelText('count');
    fireEvent.change(input, { target: { value: '4' } });
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledWith(4);

    fireEvent.change(input, { target: { value: '3' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    expect(onChange).toHaveBeenCalledWith(3);
  });
});
