import { timeAgo } from '../lib/format';
import { useNow } from '../lib/hooks';
import { useAppState } from '../state/store';
import { ActivityIcon } from './ui/ActivityIcon';
import { EmptyState } from './ui/States';
import { Radio } from 'lucide-react';

export function ActivityFeed({ limit = 8 }: { limit?: number }) {
  const now = useNow(20_000);
  const items = useAppState(
    (s) => s.activity.slice(0, limit),
    (a, b) => a.length === b.length && a.every((x, i) => x.id === b[i]?.id && x.at === b[i]?.at && x.detail === b[i]?.detail),
  );
  if (!items.length) {
    return <EmptyState icon={Radio} title="Sem atividade ainda" text="Os eventos da LIVE aparecem aqui assim que chegarem." />;
  }
  return (
    <ul className="feed">
      {items.map((item) => (
        <li key={item.id} className="feed__item">
          <span className={`feed__icon feed__icon--${item.kind}`}>
            <ActivityIcon kind={item.kind} />
          </span>
          <span className="feed__text">
            <span className="feed__title">{item.title}</span>
            {item.detail ? <span className="feed__detail">{item.detail}</span> : null}
          </span>
          <time className="feed__time" dateTime={new Date(item.at).toISOString()}>
            {timeAgo(now, item.at)}
          </time>
        </li>
      ))}
    </ul>
  );
}
