import React from 'react';
import { render, fireEvent, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// The optimizer deliberately makes no backend calls, but TestWrapper mounts the
// auth provider, which does.
vi.mock('@/lib/api/client', async () => {
  const actual = await import('../lib/api/client');
  return { ...actual };
});

import ElterngeldOptimizer from '@/components/tools/ElterngeldOptimizer';
import ElterngeldPage from '@/app/tools/elterngeld/page';
import { TestWrapper } from '@/lib/test-utils';

function renderTool() {
  const result = render(
    <TestWrapper>
      <ElterngeldOptimizer />
    </TestWrapper>,
  );
  return within(result.container as HTMLElement);
}

/** Reads the big signed euro figure out of the recommendation banner. */
function verdictAmount(scope: ReturnType<typeof within>) {
  return scope.getByRole('status').textContent ?? '';
}

describe('ElterngeldOptimizer', () => {
  it('renders the recommendation, the comparison table and the chart', () => {
    const scope = renderTool();

    expect(scope.getByRole('status')).toBeInTheDocument();
    expect(scope.getByText('Net position across both years')).toBeInTheDocument();
    expect(scope.getByText('Declared profit (Gewinn)')).toBeInTheDocument();
    expect(scope.getByRole('img', { name: /net position by declared profit/i })).toBeInTheDocument();
  });

  it('recommends the higher profit for the Kindertagespflege example', () => {
    const scope = renderTool();
    const verdict = verdictAmount(scope);

    expect(verdict).toContain('+');
    expect(verdict).toMatch(/Declaring the/);
    expect(verdict).toMatch(/higher/);
  });

  it('shows the statutory equations with the caller’s own figures', () => {
    const scope = renderTool();

    expect(scope.getByText(/1 · From profit to Elterngeld-Netto/)).toBeInTheDocument();
    expect(scope.getByText(/2 · The replacement rate/)).toBeInTheDocument();
    expect(scope.getByText(/5 · Progressionsvorbehalt/)).toBeInTheDocument();
    expect(scope.getByText(/monthly gross\s+= Gewinn \/ 12/)).toBeInTheDocument();
  });

  it('rejects two identical profit figures', () => {
    const scope = renderTool();
    const lower = scope.getByLabelText(/Lower profit/i);

    fireEvent.change(lower, { target: { value: '24470.36' } });

    expect(scope.getByText(/Enter two different profit figures/i)).toBeInTheDocument();
    expect(scope.queryByRole('status')).not.toBeInTheDocument();
  });

  it('rejects a negative profit', () => {
    const scope = renderTool();

    fireEvent.change(scope.getByLabelText(/Lower profit/i), { target: { value: '-100' } });

    expect(scope.getByText(/cannot be negative/i)).toBeInTheDocument();
  });

  it('treats real extra earnings as worth more than a write-off timing shift', () => {
    const scope = renderTool();
    const timingVerdict = verdictAmount(scope);

    fireEvent.click(scope.getByRole('button', { name: 'Real extra earnings' }));
    const cashVerdict = verdictAmount(scope);

    expect(cashVerdict).not.toBe(timingVerdict);
    // Under 'cash' the extra profit is real money, so the advantage is larger.
    expect(scope.getByRole('button', { name: 'Real extra earnings' })).toHaveAttribute('aria-pressed', 'true');
    expect(scope.getByRole('button', { name: 'Write-off timing' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('surfaces a Progressionsvorbehalt cost once the household has leave-year income', () => {
    const scope = renderTool();

    fireEvent.click(scope.getByRole('button', { name: /Married/i }));
    fireEvent.change(scope.getByLabelText(/Partner income.*leave yr/i), { target: { value: '55000' } });

    const table = within(scope.getByRole('table'));
    const row = table.getByText(/Progressionsvorbehalt \(§ 32b EStG\)/).closest('tr');
    expect(row).not.toBeNull();
    // Both option columns now carry a non-zero cost.
    expect(row?.textContent).toMatch(/-\s?\d/);
  });

  it('warns when the income limit removes the entitlement', () => {
    const scope = renderTool();

    fireEvent.change(scope.getByLabelText(/Higher profit/i), { target: { value: '250000' } });

    expect(scope.getByText(new RegExp(`removes the Elterngeld claim entirely`, 'i'))).toBeInTheDocument();
  });

  it('warns that the assessment base is capped at 2,770 EUR', () => {
    const scope = renderTool();

    fireEvent.change(scope.getByLabelText(/Higher profit/i), { target: { value: '90000' } });

    expect(scope.getByText(/is ignored \(§ 2 Abs\. 1 Satz 3 BEEG\)/i)).toBeInTheDocument();
  });

  it('warns while postponed write-offs are still valued at zero, and stops once priced', () => {
    const scope = renderTool();
    expect(scope.getByText(/Postponed write-offs are valued at zero/i)).toBeInTheDocument();

    fireEvent.change(scope.getByLabelText(/Later relief on postponed write-offs/i), { target: { value: '25' } });

    expect(scope.queryByText(/Postponed write-offs are valued at zero/i)).not.toBeInTheDocument();
  });

  it('restores the worked example after the inputs are changed', () => {
    const scope = renderTool();
    const lower = scope.getByLabelText(/Lower profit/i) as HTMLInputElement;

    fireEvent.change(lower, { target: { value: '5000' } });
    expect(lower.value).toBe('5000');

    fireEvent.click(scope.getByRole('button', { name: /Load Kindertagespflege example/i }));
    expect((scope.getByLabelText(/Lower profit/i) as HTMLInputElement).value).toBe('13421.69');
  });

  it('reflects the flat § 2f social deduction toggles in the equations', () => {
    const scope = renderTool();
    // Pension only by default -> 10 %.
    expect(scope.getByText(/monthly gross × 10 %/)).toBeInTheDocument();

    fireEvent.click(scope.getByLabelText(/Compulsory health insurance/i));
    expect(scope.getByText(/monthly gross × 19 %/)).toBeInTheDocument();
  });
});

describe('Elterngeld page', () => {
  it('renders inside ToolPage with the single h1 owned by the wrapper', () => {
    const { container } = render(
      <TestWrapper>
        <ElterngeldPage />
      </TestWrapper>,
    );
    const scope = within(container as HTMLElement);
    const headings = scope.getAllByRole('heading', { level: 1 });

    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent('Elterngeld Optimizer');
  });
});
