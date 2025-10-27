import React, { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Counter from '../components/ui/Counter';

function Wrapper() {
  const [v, setV] = useState(5);
  return (
    <div>
      <Counter value={v} onChange={setV} min={0} max={10} />
      <div data-testid="current">{v}</div>
    </div>
  );
}

describe('Counter interactions', () => {
  it('increments and decrements using buttons', () => {
    render(<Wrapper />);
    const inc = screen.getByLabelText('increment');
    const dec = screen.getByLabelText('decrement');
    const current = screen.getByTestId('current');

    expect(current.textContent).toBe('5');
    fireEvent.click(inc);
    expect(current.textContent).toBe('6');
    fireEvent.click(dec);
    fireEvent.click(dec);
    expect(current.textContent).toBe('4');
  });

  it('commits value on blur and clamps on Enter', () => {
    render(<Wrapper />);
    const input = screen.getByLabelText('count') as HTMLInputElement;
    const current = screen.getByTestId('current');

    // type a new valid value and blur
    fireEvent.change(input, { target: { value: '9' } });
    fireEvent.blur(input);
    expect(current.textContent).toBe('9');

    // type an out-of-range value and press Enter to commit (clamped to max 10)
    fireEvent.change(input, { target: { value: '99' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    expect(current.textContent).toBe('10');

    // non-number should fallback to min (0)
    fireEvent.change(input, { target: { value: 'abc' } });
    fireEvent.blur(input);
    expect(current.textContent).toBe('0');
  });
});
