import type { Quest } from '../../lib/schemas';
import QuestCard from './QuestCard';

interface Props {
  quests: Quest[];
  emptyMessage?: string;
}

export default function QuestList({ quests, emptyMessage = 'No quests here yet.' }: Props) {
  if (quests.length === 0) {
    return (
      <p className="text-sm text-center py-6" style={{ color: 'var(--text-tertiary)' }}>
        {emptyMessage}
      </p>
    );
  }

  return (
    <div>
      {quests.map((quest) => (
        <QuestCard key={quest.id} quest={quest} />
      ))}
    </div>
  );
}
