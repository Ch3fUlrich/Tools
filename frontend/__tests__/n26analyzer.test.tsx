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
