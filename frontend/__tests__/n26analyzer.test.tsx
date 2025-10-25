/// <reference types="vitest/globals" />
import { vi, type Mock } from 'vitest';
import * as apiClient from '@/lib/api/client';
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import N26Analyzer from '@/components/tools/N26Analyzer';

describe('N26Analyzer', () => {
  beforeEach(() => {
  vi.resetAllMocks();
  });

  it('renders analysis results on success (fetch stub)', async () => {
    const user = userEvent.setup();

  // spy on the client function used by the component so we intercept the real import
  const spy = vi.spyOn(apiClient, 'analyzeN26Data').mockResolvedValueOnce({ overall_total: 123.45, category_totals: {}, transactions: [] }) as unknown as Mock;

  const { container } = render(<N26Analyzer />);

  const file = new File([JSON.stringify({ transactions: [] })], 'n26.json', { type: 'application/json' });
  // attach a text() implementation directly to the File instance
  (file as any).text = async () => JSON.stringify({ transactions: [] });
    const input = screen.getByLabelText(/Upload N26 JSON File/i) as HTMLInputElement;

    await user.upload(input, file);

    // wait for the submit button to become enabled (file set)
    await waitFor(() => expect(screen.getByRole('button', { name: /Analyze Transactions/i })).not.toBeDisabled());

  // trigger form submit directly to ensure onSubmit handler runs in jsdom
  const form = container.querySelector('form') as HTMLFormElement | null;
  if (!form) throw new Error('form not found');
  fireEvent.submit(form);

    // ensure the API client spy was invoked
    await waitFor(() => expect(spy).toHaveBeenCalled());

      // results should be rendered from the stubbed API
      await waitFor(() => expect(screen.getByText(/Recent Transactions/)).toBeInTheDocument());
  });

  it('renders full analysis results with transactions and category totals', async () => {
    const user = userEvent.setup();

    const mockResult = {
      overall_total: 150.75,
      category_totals: {
        'Food': -45.50,
        'Transport': -25.25,
        'Salary': 200.00,
        'Entertainment': -15.25
      },
      transactions: [
        {
          date: '2024-01-15',
          category: 'Food',
          comment: 'Lunch at restaurant',
          amount: -12.50
        },
        {
          date: '2024-01-14',
          category: 'Transport',
          comment: 'Bus ticket',
          amount: -2.90
        },
        {
          date: '2024-01-13',
          category: 'Salary',
          comment: 'Monthly salary',
          amount: 200.00
        }
      ]
    };

    const spy = vi.spyOn(apiClient, 'analyzeN26Data').mockResolvedValueOnce(mockResult);

    const { container } = render(<N26Analyzer />);

    const file = new File([JSON.stringify({ transactions: [] })], 'n26.json', { type: 'application/json' });
    (file as any).text = async () => JSON.stringify({ transactions: [] });

    const input = screen.getByLabelText(/Upload N26 JSON File/i) as HTMLInputElement;
    await user.upload(input, file);

    await waitFor(() => expect(screen.getByRole('button', { name: /Analyze Transactions/i })).not.toBeDisabled());

    const form = container.querySelector('form') as HTMLFormElement | null;
    if (!form) throw new Error('form not found');
    fireEvent.submit(form);

    await waitFor(() => expect(spy).toHaveBeenCalled());

    // Check overall total
    expect(screen.getByText('+150.75 €')).toBeInTheDocument();

    // Check category totals - look for Food in the category totals section
    const categoryTotalsSection = screen.getByText('Category Totals').closest('div');
    expect(categoryTotalsSection).toHaveTextContent('Food');
    expect(categoryTotalsSection).toHaveTextContent('-45.50 €');
    expect(categoryTotalsSection).toHaveTextContent('Transport');
    expect(categoryTotalsSection).toHaveTextContent('-25.25 €');
    expect(categoryTotalsSection).toHaveTextContent('Salary');
    expect(categoryTotalsSection).toHaveTextContent('+200.00 €');

    // Check transactions table
    expect(screen.getByText('Recent Transactions (3 total)')).toBeInTheDocument();
    expect(screen.getByText('2024-01-15')).toBeInTheDocument();
    expect(screen.getByText('Lunch at restaurant')).toBeInTheDocument();
    expect(screen.getByText('-12.50 €')).toBeInTheDocument();
  });

  it('shows error when uploading invalid (non-JSON) file', async () => {
    const user = userEvent.setup();
  const { container } = render(<N26Analyzer />);

  // upload a file with .json extension but invalid content to bypass the input accept filter
  const badFile = new File(['not a json'], 'invalid.json', { type: 'application/json' });
  // attach a text() implementation that returns invalid JSON
  (badFile as any).text = async () => 'not a json';
    const input = screen.getByLabelText(/Upload N26 JSON File/i) as HTMLInputElement;

    await user.upload(input, badFile);

    // submit
    await waitFor(() => expect(screen.getByRole('button', { name: /Analyze Transactions/i })).not.toBeDisabled());
  const form = container.querySelector('form') as HTMLFormElement | null;
  if (!form) throw new Error('form not found');
  fireEvent.submit(form);

    // component should render the error message produced by the catch block
    await waitFor(() => expect(screen.getByText((content) => /Failed to analyze file/i.test(content))).toBeInTheDocument());
  });
});
