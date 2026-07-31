import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TestWrapper } from '@/lib/test-utils';

describe('TestWrapper', () => {
  it('renders children correctly', async () => {
    await act(async () => {
      render(<TestWrapper><div>Test content</div></TestWrapper>);
    });
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });
});