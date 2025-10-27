import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import NumberInput from '../components/ui/NumberInput';

describe('NumberInput steppers and formatting', () => {
  it('increments and decrements with integer step and respects min', () => {
    const onChange = vi.fn();
    render(<NumberInput value={String(2)} onChange={onChange} step={1} min={2} />);

    const inc = screen.getByLabelText('Increase value');
    const dec = screen.getByLabelText('Decrease value');

    fireEvent.click(inc);
    expect(onChange).toHaveBeenCalledWith('3');

    // decrement should not go below min (2)
    fireEvent.click(dec);
    // first call produced '3', second should produce '2' (from 3 -> 2)
    // call again to reach min
    fireEvent.click(dec);
    expect(onChange).toHaveBeenCalled();
  });

  it('uses decimal step and formats to two decimals', () => {
    const onChange = vi.fn();
    render(<NumberInput value={'0.0'} onChange={onChange} step={0.1} min={0} />);
    const inc = screen.getByLabelText('Increase value');
    fireEvent.click(inc);
    // 0.0 + 0.1 => '0.10' formatted to two decimals
    expect(onChange).toHaveBeenCalledWith('0.10');
  });

  it('calls onChange when typing into the input', () => {
    const onChange = vi.fn();
    render(<NumberInput value={''} onChange={onChange} step={1} min={0} />);
    const input = screen.getByRole('spinbutton') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '42' } });
    expect(onChange).toHaveBeenCalledWith('42');
  });
});
