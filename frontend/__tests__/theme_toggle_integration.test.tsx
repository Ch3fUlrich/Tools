// @vitest-environment jsdom
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { applyTheme } from '@/lib/theme';

describe('ThemeToggle integration', () => {
  it('toggles document html class between light and dark', () => {
    // Ensure a known starting state
    applyTheme('light');
  render(<ThemeToggle />);

    const button = screen.getByRole('button', { name: /Toggle color theme/i });
    expect(document.documentElement.classList.contains('light')).toBe(true);

    // Click to switch to dark
    fireEvent.click(button);
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    // Click to switch back to light
    fireEvent.click(button);
    expect(document.documentElement.classList.contains('light')).toBe(true);
  });
});
