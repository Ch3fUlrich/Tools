import ToolPage from '@/components/tools/ToolPage';
import TimelineBuilder from '@/components/tools/TimelineBuilder';

export default function TimelineBuilderPage() {
  return (
    <ToolPage
      title="Timeline Builder"
      description="Create, edit, import, and export visual timelines with draggable stages, markers, and range blocks."
      emoji="🧭"
      gradientFrom="from-cyan-400"
      gradientTo="to-teal-500"
    >
      <TimelineBuilder />
    </ToolPage>
  );
}
