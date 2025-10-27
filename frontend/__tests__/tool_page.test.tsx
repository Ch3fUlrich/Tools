import { render, screen } from '@testing-library/react';
import ToolPage from '@/components/tools/ToolPage';

describe('ToolPage', () => {
  it('renders title, description, and children correctly', () => {
    render(
      <ToolPage title="Test Tool" description="This is a test tool description">
        <div>Test content</div>
      </ToolPage>
    );

  expect(screen.getByText('Test Tool')).toBeInTheDocument();
  expect(screen.getByText('This is a test tool description')).toBeInTheDocument();
  expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('renders without description', () => {
    render(
      <ToolPage title="Test Tool">
        <div>Test content</div>
      </ToolPage>
    );

  expect(screen.getByText('Test Tool')).toBeInTheDocument();
  expect(screen.getByText('Test content')).toBeInTheDocument();
  expect(screen.queryByText('This is a test tool description')).not.toBeInTheDocument();
  });

  it('renders back link with correct href', () => {
    render(
      <ToolPage title="Test Tool">
        <div>Test content</div>
      </ToolPage>
    );

    // Back link removed from layout; ensure there's no anchor to '/'
    const anchors = screen.queryAllByRole('link');
    expect(anchors.every(a => a.getAttribute('href') !== '/')).toBe(true);
  });
});