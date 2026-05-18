import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import TimelineBuilder from '@/components/tools/TimelineBuilder';

vi.mock('@/lib/api/client', () => ({}));

describe('TimelineBuilder', () => {
  it('embeds the standalone timeline editor', () => {
    render(<TimelineBuilder />);

    const frame = screen.getByTitle('Timeline builder editor');
    expect(frame).toBeInTheDocument();
    expect(frame).toHaveAttribute('sandbox', expect.stringContaining('allow-scripts'));
  });
});
