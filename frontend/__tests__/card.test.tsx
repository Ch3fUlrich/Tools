import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import Card from '@/components/ui/Card';

describe('Card', () => {
  it('renders children inside the card wrapper', () => {
    render(<Card><div>Inner Content</div></Card>);
    expect(screen.getByText('Inner Content')).toBeInTheDocument();
  });
});
