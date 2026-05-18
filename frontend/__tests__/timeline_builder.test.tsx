import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import TimelineBuilder from '@/components/tools/TimelineBuilder';

vi.mock('@/lib/api/client', () => ({}));

describe('TimelineBuilder', () => {
  it('splits the standalone timeline editor into timeline and settings cards', () => {
    render(<TimelineBuilder />);

    expect(screen.getByRole('heading', { name: 'Timeline' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Timeline Settings Table' })).toBeInTheDocument();

    const timelineFrame = screen.getByTitle('Timeline builder preview');
    const settingsFrame = screen.getByTitle('Timeline builder settings table');

    expect(timelineFrame).toBeInTheDocument();
    expect(settingsFrame).toBeInTheDocument();
    expect(timelineFrame).toHaveAttribute('sandbox', expect.stringContaining('allow-scripts'));
    expect(settingsFrame).toHaveAttribute('sandbox', expect.stringContaining('allow-scripts'));
    expect(screen.getAllByRole('button', { name: 'Default' })).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Resize Timeline right edge' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Resize Timeline Settings Table bottom edge' })).toBeInTheDocument();
  });
});
