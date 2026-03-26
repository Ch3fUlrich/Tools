import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import BloodLevelPage from '@/app/tools/bloodlevel/page';
import { TestWrapper } from '@/lib/test-utils';

describe('BloodLevel page', () => {
  it('renders the BloodLevel page component', () => {
    render(<TestWrapper><BloodLevelPage /></TestWrapper>);
    // BloodLevelCalculator renders a button labeled 'Add Intake' in tests; assert presence
    expect(screen.queryByRole('button', { name: /Add Intake/i })).toBeTruthy();
  });
});
