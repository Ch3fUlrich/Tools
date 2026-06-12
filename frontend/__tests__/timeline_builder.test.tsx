import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import TimelineBuilder from '@/components/tools/TimelineBuilder';

vi.mock('@/lib/api/client', () => ({}));

describe('TimelineBuilder', () => {
  it('embeds the standalone editor once with figure and settings combined', () => {
    const { container } = render(<TimelineBuilder />);

    const frame = screen.getByTitle('Timeline editor');
    expect(frame).toBeInTheDocument();
    expect(frame).toHaveAttribute('sandbox', expect.stringContaining('allow-scripts'));
    expect(frame).toHaveAttribute('sandbox', expect.stringContaining('allow-same-origin'));

    // Single embed — the old dual-iframe layout is gone.
    expect(container.querySelectorAll('iframe')).toHaveLength(1);

    // The resizable host card and the autosave hint are present.
    expect(container.querySelector('.timeline-embed-card')).toBeInTheDocument();
    expect(screen.getByText(/saved in this browser automatically/i)).toBeInTheDocument();
  });
});
