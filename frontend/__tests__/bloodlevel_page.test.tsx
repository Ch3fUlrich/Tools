import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import BloodLevelPage from '@/app/tools/bloodlevel/page';

describe('BloodLevel page', () => {
  it('renders the BloodLevel page component', () => {
    render(<BloodLevelPage />);
    // BloodLevelCalculator renders a button labeled 'Add Intake' in tests; assert presence
    expect(screen.queryByRole('button', { name: /Add Intake/i })).toBeTruthy();
  });
});
