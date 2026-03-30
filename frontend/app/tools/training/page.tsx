import TrainingTracker from '@/components/tools/TrainingTracker';
import ToolPage from '@/components/tools/ToolPage';

export const metadata = {
  title: 'Training Tracker',
};

export default function TrainingPage() {
  return (
    <ToolPage title="Training Tracker" description="Track workouts with physics-based energy calculation and muscle activation heat maps." emoji="💪" gradientFrom="from-orange-500" gradientTo="to-red-600">
      <TrainingTracker />
    </ToolPage>
  );
}
