import DiceRoller from '@/components/tools/DiceRoller';
import ToolPage from '@/components/tools/ToolPage';

export const metadata = {
  title: 'Dice Roller',
};

export default function DicePage() {
  return (
    <ToolPage title="Dice Roller" description="Roll dice with various options including advantage/disadvantage and custom dice types.">
      <DiceRoller />
    </ToolPage>
  );
}
