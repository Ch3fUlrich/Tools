import DiceRoller from '@/components/tools/DiceRoller';
import ToolPage from '@/components/tools/ToolPage';

export const metadata = {
  title: 'Dice — 🧰',
};

export default function DicePage() {
  return (
    <ToolPage title="Dice Roller" description="Roll dice with advantage, disadvantage, reroll rules, and detailed statistics." emoji="🎲" gradientFrom="from-indigo-500" gradientTo="to-purple-600">
      <DiceRoller />
    </ToolPage>
  );
}
