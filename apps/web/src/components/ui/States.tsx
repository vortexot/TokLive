import type { CSSProperties, ReactNode } from 'react';
import { AlertTriangle, type LucideIcon } from 'lucide-react';
import { Button } from './Button';
import './ui.css';

export function EmptyState({
  icon: Icon,
  title,
  text,
  children,
}: {
  icon: LucideIcon;
  title: string;
  text?: string;
  children?: ReactNode;
}) {
  return (
    <div className="state">
      <div className="state__plate" aria-hidden>
        <Icon size={24} />
      </div>
      <h3 className="state__title">{title}</h3>
      {text ? <p className="state__text">{text}</p> : null}
      {children ? <div className="state__actions">{children}</div> : null}
    </div>
  );
}

export function ErrorState({
  title = 'Algo deu errado',
  text,
  onRetry,
}: {
  title?: string;
  text?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="state state--error" role="alert">
      <div className="state__plate" aria-hidden>
        <AlertTriangle size={24} />
      </div>
      <h3 className="state__title">{title}</h3>
      {text ? <p className="state__text">{text}</p> : null}
      {onRetry ? (
        <div className="state__actions">
          <Button variant="secondary" onClick={onRetry}>
            Tentar novamente
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function Skeleton({ width = '100%', height = '1rem', style }: { width?: string; height?: string; style?: CSSProperties }) {
  return <span className="skeleton" style={{ width, height, ...style }} aria-hidden />;
}
