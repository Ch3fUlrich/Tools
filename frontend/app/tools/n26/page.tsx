import N26Analyzer from '@/components/tools/N26Analyzer';
import ToolPage from '@/components/tools/ToolPage';

export const metadata = {
  title: 'N26 Transaction Analyzer',
};

export default function N26Page() {
  return (
    <ToolPage title="N26 Transaction Analyzer" description="Analyze your N26 bank transactions and get insights into your spending patterns.">
      <N26Analyzer />
    </ToolPage>
  );
}
