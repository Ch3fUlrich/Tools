// @vitest-environment jsdom
import React from 'react';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import ThemeInitializer from '@/components/ThemeInitializer';
import AdvantageIcon from '@/components/icons/AdvantageIcon';
import DieSelect from '@/components/ui/DieSelect';

beforeEach(() => {
  // ensure clean DOM classes
  document.documentElement.className = '';
  localStorage.clear();
});

afterEach(() => {
  cleanup();
});

describe('ThemeInitializer', () => {
  it('applies dark when localStorage theme is dark', () => {
    localStorage.setItem('theme', 'dark');
    render(<ThemeInitializer />);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('applies light when localStorage theme is light', () => {
    localStorage.setItem('theme', 'light');
    render(<ThemeInitializer />);
    expect(document.documentElement.classList.contains('light')).toBe(true);
  });

  it('uses prefers-color-scheme when no theme in storage', () => {
    // mock matchMedia to return matches true
  // @ts-ignore
  window.matchMedia = (_q: string) => ({ matches: true, addListener: () => {}, removeListener: () => {} });
    render(<ThemeInitializer />);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
});

describe('Icons and UI helpers', () => {
  it('renders AdvantageIcon svg', () => {
    render(<AdvantageIcon />);
    const svg = document.querySelector('svg');
    expect(svg).toBeTruthy();
  });

  it('DieSelect opens and selects an option', () => {
    const options = [
      { value: 'd6', label: 'D6', sides: 6 },
      { value: 'd20', label: 'D20', sides: 20 },
    ];
    const handleChange = vi.fn();
    render(<DieSelect options={options} value="d6" onChange={handleChange} />);

  // button shows current label (use role+name to avoid matching hidden native option)
  const btn = screen.getByRole('button', { name: /D6/ });
  expect(btn).toBeInTheDocument();
    fireEvent.click(btn);

    // option appears inside the visible listbox (ignore the hidden native select)
    const listbox = screen.getByRole('listbox');
    const opt = within(listbox).getByRole('option', { name: /D20/ });
    expect(opt).toBeInTheDocument();

    // click option to select
    fireEvent.click(opt);
    expect(handleChange).toHaveBeenCalledWith('d20');
  });
});
