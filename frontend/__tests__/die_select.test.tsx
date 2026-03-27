/// <reference types="vitest" />
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import DieSelect from '@/components/ui/DieSelect';
import { TestWrapper } from '@/lib/test-utils';
import { vi } from 'vitest';

describe('DieSelect', () => {
  it('renders native select for accessibility and calls onChange when changed', () => {
    const options = [
      { value: 'd6', label: 'D6', sides: 6 },
      { value: 'd8', label: 'D8', sides: 8 }
    ];
    const onChange = vi.fn();

    render(<TestWrapper><DieSelect options={options} value="d6" onChange={onChange} /></TestWrapper>);

    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();

    fireEvent.change(select, { target: { value: 'd8' } });
    expect(onChange).toHaveBeenCalledWith('d8');
  });
});
