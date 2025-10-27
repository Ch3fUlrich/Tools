import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import DieSelect from '@/components/ui/DieSelect';
import { vi } from 'vitest';

describe('DieSelect interactive listbox', () => {
  it('opens listbox and lets user pick an option (calls onChange and closes)', () => {
    const options = [
      { value: 'd6', label: 'D6', sides: 6 },
      { value: 'd8', label: 'D8', sides: 8 },
      { value: 'd10', label: 'D10', sides: 10 }
    ];
    const onChange = vi.fn();

    render(<DieSelect options={options} value="d6" onChange={onChange} />);

    // open the custom listbox by clicking the visible button
    const toggle = screen.getByRole('button');
    fireEvent.click(toggle);

    // the listbox should be present
    const listbox = screen.getByRole('listbox');
    expect(listbox).toBeInTheDocument();

    // click the D10 option
    const option = within(listbox).getByRole('option', { name: /D10/ });
    fireEvent.click(option);

    expect(onChange).toHaveBeenCalledWith('d10');

    // after selection, the listbox should be closed (no longer in the document)
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});
