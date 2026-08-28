import N26Analyzer from '@/components/tools/N26Analyzer';
import ToolPage from '@/components/tools/ToolPage';

export const metadata = {
  title: 'N26 — 🧰',
};

export default function N26Page() {
  return (
    <ToolPage titleKey="tools.n26.title" descriptionKey="tools.n26.description" title="N26 Transaction Analyzer" description="Analyze your N26 bank transactions and get insights into your spending patterns." emoji="🏦" gradientFrom="from-blue-500" gradientTo="to-cyan-600">
      <N26Analyzer />
    </ToolPage>
  );
}
