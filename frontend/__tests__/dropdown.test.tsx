import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import Dropdown from '@/components/ui/Dropdown';

describe('Dropdown', () => {
  it('renders options and calls onChange', () => {
    const onChange = vi.fn();
    const items = [
      { value: 'a', label: 'A' },
      { value: 'b', label: 'B' },
    ];
    render(<Dropdown items={items} value="a" onChange={onChange} />);
  const select = screen.getByRole('combobox');
    expect(select).toBeTruthy();
    fireEvent.change(select, { target: { value: 'b' } });
    expect(onChange).toHaveBeenCalledWith('b');
  });
});
