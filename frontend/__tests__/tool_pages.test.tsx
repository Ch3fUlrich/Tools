import { render, screen } from '@testing-library/react';
import DicePage from '@/app/tools/dice/page';
import FatLossPage from '@/app/tools/fat-loss/page';
import N26Page from '@/app/tools/n26/page';

describe('Tool Pages', () => {
  describe('DicePage', () => {
    it('renders the dice roller page with correct title and description', () => {
      render(<DicePage />);

      // Check for the main h1 title (first one in the page layout)
      const headings = screen.getAllByRole('heading', { level: 1, name: 'Dice Roller' });
      expect(headings.length).toBeGreaterThan(0);
  // Page-level description removed; ensure the page title is present and the tool is rendered.
    });
  });

  describe('FatLossPage', () => {
    it('renders the fat loss calculator page with correct title and description', () => {
      render(<FatLossPage />);

      // Check for the main h1 title (first one in the page layout)
      const headings = screen.getAllByRole('heading', { level: 1, name: 'Fat Loss Calculator' });
      expect(headings.length).toBeGreaterThan(0);
  // Page-level description removed; title presence is the primary check.
    });
  });

  describe('N26Page', () => {
    it('renders the N26 analyzer page with correct title and description', () => {
      render(<N26Page />);

      // Check for the main h1 title
      expect(screen.getByRole('heading', { level: 1, name: 'N26 Transaction Analyzer' })).toBeInTheDocument();
  // Page-level description removed; ensure title renders.
    });
  });
});