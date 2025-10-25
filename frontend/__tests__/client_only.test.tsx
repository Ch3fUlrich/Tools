import { render, screen } from '@testing-library/react';
import ClientOnly from '@/components/ui/ClientOnly';

describe('ClientOnly', () => {
  it('renders children immediately in test environment (useEffect runs synchronously)', () => {
    render(
      <ClientOnly fallback={<div>Loading...</div>}>
        <div>Client content</div>
      </ClientOnly>
    );

    // In jsdom, useEffect runs synchronously, so children are rendered immediately
    expect(screen.getByText('Client content')).toBeInTheDocument();
  });

  it('renders with custom fallback initially in test environment', () => {
    render(
      <ClientOnly fallback={<div>Custom loading...</div>}>
        <div>Client content</div>
      </ClientOnly>
    );

    // In jsdom, useEffect runs synchronously, so children are rendered immediately
    expect(screen.getByText('Client content')).toBeInTheDocument();
  });

  it('renders null as default fallback in test environment', () => {
    render(
      <ClientOnly>
        <div>Client content</div>
      </ClientOnly>
    );

    // In jsdom, useEffect runs synchronously, so children are rendered immediately
    expect(screen.getByText('Client content')).toBeInTheDocument();
  });
});