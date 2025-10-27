// @vitest-environment jsdom
import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';

import DieSelect from '@/components/ui/DieSelect';

describe('DieSelect interactions', () => {
  const options = [
    { value: 'd6', label: 'D6', sides: 6 },
    { value: 'd20', label: 'D20', sides: 20 },
  ];

  it('opens listbox, selects option, and closes on selection', () => {
    const handleChange = vi.fn();
    render(<DieSelect options={options} value="d6" onChange={handleChange} />);

    // native select exists for accessibility
    expect(screen.getByRole('combobox')).toBeInTheDocument();

    // open the custom listbox
    const toggle = screen.getByRole('button');
    fireEvent.click(toggle);
    expect(screen.getByRole('listbox')).toBeInTheDocument();

  // click the D20 option inside the visible listbox (ignore hidden native <option>)
  const listbox = screen.getByRole('listbox');
  const opt = within(listbox).getByRole('option', { name: /D20/ });
  fireEvent.click(opt);

    expect(handleChange).toHaveBeenCalledWith('d20');
    // listbox should be closed (no listbox role present)
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('closes when clicking outside', () => {
    const handleChange = vi.fn();
    render(<DieSelect options={options} value="d6" onChange={handleChange} />);

    const toggle = screen.getByRole('button');
    fireEvent.click(toggle);
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    // click on the document body to simulate outside click
    fireEvent.click(document.body);
    expect(screen.queryByRole('listbox')).toBeNull();
  });
});
