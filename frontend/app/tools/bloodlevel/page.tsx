import BloodLevelCalculator from '@/components/tools/BloodLevelCalculator';
import ToolPage from '@/components/tools/ToolPage';

export const metadata = {
  title: 'Blood Level — 🧰',
};

export default function BloodLevelPage() {
  return (
    <ToolPage
      title="Blood Level Calculator"
      description="Calculate substance elimination and blood levels over time using pharmacokinetic models."
      emoji="🧪"
      gradientFrom="from-red-500"
      gradientTo="to-rose-600"
    >
      <BloodLevelCalculator />
    </ToolPage>
  );
}
