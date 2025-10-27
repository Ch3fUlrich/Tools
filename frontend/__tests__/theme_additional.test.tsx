import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import ThemeToggle from '../components/ui/ThemeToggle';

describe('ThemeToggle component', () => {
  beforeEach(() => {
    try { localStorage.clear(); } catch {}
    document.documentElement.className = '';
  });

  it('toggles theme and updates localStorage and document classes', () => {
    render(<ThemeToggle />);
    const btn = screen.getByRole('button', { name: /toggle color theme/i });
    // initial state: light
    expect(btn).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(btn);
    // now should be dark
    expect(btn).toHaveAttribute('aria-pressed', 'true');
    expect(localStorage.getItem('theme')).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    // toggle back
    fireEvent.click(btn);
    expect(btn).toHaveAttribute('aria-pressed', 'false');
    expect(localStorage.getItem('theme')).toBe('light');
  });
});
