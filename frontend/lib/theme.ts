// Client-side theme helpers
export type Theme = 'light' | 'dark' | null;

export function getStoredTheme(): Theme {
  try {
    return (localStorage.getItem('theme') as Theme) || null;
  } catch {
    return null;
  }
}

export function setStoredTheme(value: Theme) {
  try {
    if (value === null) {
      localStorage.removeItem('theme');
    } else {
      localStorage.setItem('theme', value);
    }
  } catch {
    // ignore
  }
}

export function prefersDark(): boolean {
  try {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch {
    return false;
  }
}

export function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return;
  const html = document.documentElement;
  if (theme === 'dark') {
    html.classList.add('dark');
    html.classList.remove('light');
  } else if (theme === 'light') {
    html.classList.remove('dark');
    html.classList.add('light');
  } else {
    // no explicit theme: remove both so media queries can take over
    html.classList.remove('dark');
    html.classList.remove('light');
  }
}

export function resolveInitialTheme(): Theme {
  const stored = getStoredTheme();
  if (stored) return stored;
  return prefersDark() ? 'dark' : 'light';
}
