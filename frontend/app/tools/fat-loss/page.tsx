import FatLossCalculator from '@/components/tools/FatLossCalculator';
import ToolPage from '@/components/tools/ToolPage';

export const metadata = {
  title: 'Fat Loss Calculator',
};

export default function FatLossPage() {
  return (
    <ToolPage title="Fat Loss Calculator" description="Calculate the percentage of fat vs muscle loss based on your calorie deficit and weight loss.">
      <FatLossCalculator />
    </ToolPage>
  );
}
