import React from 'react';
import { render, fireEvent, within, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await import('../lib/api/client');
  return { ...actual };
});

import { LanguageProvider, useTranslation } from '@/components/i18n/LanguageProvider';
import LanguageToggle from '@/components/layout/LanguageToggle';
import ElterngeldOptimizer from '@/components/tools/ElterngeldOptimizer';
import { LANGUAGE_STORAGE_KEY, detectBrowserLanguage, isLanguage } from '@/lib/i18n';
import { de, en } from '@/lib/i18n/messages';

function Probe() {
  const { t, language } = useTranslation();
  return (
    <div>
      <span data-testid="lang">{language}</span>
      <span data-testid="msg">{t('eg.household')}</span>
      <span data-testid="interp">{t('eg.filingSaves', { amount: '1.234,00 €' })}</span>
      <span data-testid="missing">{t('common.appName')}</span>
    </div>
  );
}

describe('message catalogues', () => {
  /** Walks both trees together so a forgotten German string fails loudly. */
  function compare(a: unknown, b: unknown, path: string[] = []): string[] {
    if (typeof a === 'string') {
      return typeof b === 'string' && b.length > 0 ? [] : [path.join('.')];
    }
    if (a && typeof a === 'object') {
      return Object.keys(a as object).flatMap((key) =>
        compare(
          (a as Record<string, unknown>)[key],
          (b as Record<string, unknown> | undefined)?.[key],
          [...path, key],
        ),
      );
    }
    return [];
  }

  it('has a non-empty German string for every English key', () => {
    expect(compare(en, de)).toEqual([]);
  });

  it('has no English keys missing from German and vice versa', () => {
    expect(Object.keys(de)).toEqual(Object.keys(en));
    expect(Object.keys(de.eg)).toEqual(Object.keys(en.eg));
    expect(Object.keys(de.tools)).toEqual(Object.keys(en.tools));
  });

  it('actually translates rather than copying the English through', () => {
    expect(de.eg.household).not.toBe(en.eg.household);
    expect(de.common.tagline).not.toBe(en.common.tagline);
    expect(de.tools.dice.title).not.toBe(en.tools.dice.title);
  });

  it('keeps every interpolation placeholder in the translation', () => {
    const placeholders = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();
    for (const key of Object.keys(en.eg) as (keyof typeof en.eg)[]) {
      expect(placeholders(de.eg[key])).toEqual(placeholders(en.eg[key]));
    }
  });
});

describe('LanguageProvider', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders English by default and switches on demand', async () => {
    const { container } = render(
      <LanguageProvider>
        <LanguageToggle />
        <Probe />
      </LanguageProvider>,
    );
    const scope = within(container);

    expect(scope.getByTestId('lang')).toHaveTextContent('en');
    expect(scope.getByTestId('msg')).toHaveTextContent(en.eg.household);

    await act(async () => {
      fireEvent.click(scope.getByRole('radio', { name: /Auf Deutsch umschalten/i }));
    });

    expect(scope.getByTestId('lang')).toHaveTextContent('de');
    expect(scope.getByTestId('msg')).toHaveTextContent(de.eg.household);
  });

  it('substitutes interpolation variables', () => {
    const { container } = render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>,
    );
    expect(within(container).getByTestId('interp')).toHaveTextContent('1.234,00 €');
  });

  it('persists the choice and marks the current one for screen readers', async () => {
    const { container } = render(
      <LanguageProvider>
        <LanguageToggle />
      </LanguageProvider>,
    );
    const scope = within(container);

    await act(async () => {
      fireEvent.click(scope.getByRole('radio', { name: /Auf Deutsch umschalten/i }));
    });

    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('de');
    expect(scope.getByRole('radio', { name: /Auf Deutsch umschalten/i })).toHaveAttribute('aria-checked', 'true');
    expect(scope.getByRole('radio', { name: /Switch to English/i })).toHaveAttribute('aria-checked', 'false');
    expect(document.documentElement.lang).toBe('de');
  });

  it('falls back to English outside a provider instead of throwing', () => {
    const { container } = render(<Probe />);
    expect(within(container).getByTestId('msg')).toHaveTextContent(en.eg.household);
  });

  it('only accepts the two supported language tags', () => {
    expect(isLanguage('de')).toBe(true);
    expect(isLanguage('en')).toBe(true);
    expect(isLanguage('fr')).toBe(false);
    expect(isLanguage(null)).toBe(false);
    expect(['en', 'de']).toContain(detectBrowserLanguage());
  });
});

describe('the Elterngeld tool in German', () => {
  it('translates its own labels, not just the page chrome', async () => {
    const { container } = render(
      <LanguageProvider>
        <LanguageToggle />
        <ElterngeldOptimizer />
      </LanguageProvider>,
    );
    const scope = within(container);

    expect(scope.getByText(en.eg.household)).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(scope.getByRole('radio', { name: /Auf Deutsch umschalten/i }));
    });

    expect(scope.getByText(de.eg.household)).toBeInTheDocument();
    expect(scope.getByText(de.eg.sideBySide)).toBeInTheDocument();
    expect(scope.getByText(de.eg.reasoningTitle)).toBeInTheDocument();
    // The recommendation banner is rebuilt from the German catalogue too.
    expect(scope.getByRole('status').textContent).toContain(de.eg.recommendation);
  });
});
