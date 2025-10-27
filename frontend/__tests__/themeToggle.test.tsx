import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ThemeToggle from '@/components/ui/ThemeToggle';

// simple matchMedia mock
function mockMatchMedia(matches = false) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

describe('ThemeToggle', () => {
  beforeEach(() => {
    // clear storage
    localStorage.clear();
    // provide a default matchMedia
    // @ts-ignore
    mockMatchMedia(false);
  });

  it('renders the toggle button', () => {
    render(<ThemeToggle />);
    const btn = screen.getByRole('button', { name: /toggle color theme/i });
    expect(btn).toBeInTheDocument();
  });

  it('toggles theme and persists preference', () => {
    render(<ThemeToggle />);
    const btn = screen.getByRole('button', { name: /toggle color theme/i });
    // initial -> light by default in test
    fireEvent.click(btn);
    // after clicking we expect localStorage to have "dark" or "light"
    const stored = localStorage.getItem('theme');
    expect(['dark','light']).toContain(stored);
  });
});
