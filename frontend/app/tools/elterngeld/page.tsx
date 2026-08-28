import ElterngeldOptimizer from '@/components/tools/ElterngeldOptimizer';
import ToolPage from '@/components/tools/ToolPage';

export const metadata = {
  title: 'Elterngeld Optimizer — 🧰',
};

export default function ElterngeldPage() {
  return (
    <ToolPage
      titleKey="tools.elterngeld.title"
      descriptionKey="tools.elterngeld.description"
      title="Elterngeld Optimizer"
      description="Decide whether declaring a higher profit — and paying more income tax — pays for itself through higher Elterngeld."
      emoji="🍼"
      gradientFrom="from-amber-400"
      gradientTo="to-orange-500"
    >
      <ElterngeldOptimizer />
    </ToolPage>
  );
}
