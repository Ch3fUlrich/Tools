import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import NumberInput from '@/components/ui/NumberInput';

describe('NumberInput', () => {
  it('renders value and calls onChange when typing', () => {
    const onChange = vi.fn();
    render(<NumberInput value="5" onChange={onChange} />);
    const input = screen.getByRole('spinbutton') as HTMLInputElement;
    expect(input.value).toBe('5');
    fireEvent.change(input, { target: { value: '7' } });
    expect(onChange).toHaveBeenCalledWith('7');
  });

  it('increase/decrease buttons call onChange with stepped values', () => {
    const onChange = vi.fn();
    render(<NumberInput value="1" onChange={onChange} step={1} min={0} />);
    const inc = screen.getByLabelText('Increase value');
    const dec = screen.getByLabelText('Decrease value');
    fireEvent.click(inc);
    expect(onChange).toHaveBeenCalled();
    fireEvent.click(dec);
    expect(onChange).toHaveBeenCalled();
  });
});
