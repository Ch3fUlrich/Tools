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
      expect(screen.getByText('Roll dice with various options including advantage/disadvantage and custom dice types.')).toBeInTheDocument();
      expect(screen.getByText('Back to Tools')).toBeInTheDocument();
    });
  });

  describe('FatLossPage', () => {
    it('renders the fat loss calculator page with correct title and description', () => {
      render(<FatLossPage />);

      // Check for the main h1 title (first one in the page layout)
      const headings = screen.getAllByRole('heading', { level: 1, name: 'Fat Loss Calculator' });
      expect(headings.length).toBeGreaterThan(0);
      expect(screen.getByText('Calculate the percentage of fat vs muscle loss based on your calorie deficit and weight loss.')).toBeInTheDocument();
      expect(screen.getByText('Back to Tools')).toBeInTheDocument();
    });
  });

  describe('N26Page', () => {
    it('renders the N26 analyzer page with correct title and description', () => {
      render(<N26Page />);

      // Check for the main h1 title
      expect(screen.getByRole('heading', { level: 1, name: 'N26 Transaction Analyzer' })).toBeInTheDocument();
      expect(screen.getByText('Analyze your N26 bank transactions and get insights into your spending patterns.')).toBeInTheDocument();
      expect(screen.getByText('Back to Tools')).toBeInTheDocument();
    });
  });
});