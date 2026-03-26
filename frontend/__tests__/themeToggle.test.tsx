import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { TestWrapper } from '@/lib/test-utils';

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
    render(<TestWrapper>{null}</TestWrapper>);
    const btn = screen.getByTestId('theme-toggle');
    expect(btn).toBeInTheDocument();
  });

  it('toggles theme and persists preference', () => {
    render(<TestWrapper>{null}</TestWrapper>);
    const btn = screen.getByTestId('theme-toggle');
    // initial -> light by default in test
    fireEvent.click(btn);
    // after clicking we expect localStorage to have "dark" or "light"
    const stored = localStorage.getItem('theme');
    expect(['dark','light']).toContain(stored);
  });
});
