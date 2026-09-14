import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TestWrapper, renderWithProviders } from '@/lib/test-utils';
import { vi } from 'vitest';

vi.mock('@/lib/api/client', () => ({
  myApiCall: vi.fn(),
  getAuthUrl: vi.fn().mockResolvedValue('http://mock-auth-url'),
  getOidcConfig: vi.fn().mockResolvedValue({ enabled: true }),
}));

describe('test-utils', () => {
  describe('TestWrapper', () => {
    it('renders children correctly', async () => {
      await act(async () => {
        render(
          <TestWrapper>
            <div>Test content</div>
          </TestWrapper>
        );
      });
      expect(screen.getByText('Test content')).toBeInTheDocument();
    });
  });

  describe('renderWithProviders', () => {
    it('renders children correctly with providers', async () => {
      await act(async () => {
        renderWithProviders(<div>Test content</div>);
      });
      expect(screen.getByText('Test content')).toBeInTheDocument();
    });
  });
});
