import { useEffect } from 'react';
import { AlertTriangle, CheckCircle2, Info, OctagonAlert, X } from 'lucide-react';
import type { ToastItem } from '../../domain/session';
import { useActions } from '../../state/AppProvider';
import { useAppState } from '../../state/store';
import { Button } from './Button';
import './ui.css';

const ICONS = { ok: CheckCircle2, info: Info, warn: AlertTriangle, erro: OctagonAlert } as const;

function ToastView({ toast, onClose }: { toast: ToastItem; onClose: () => void }) {
  const Icon = ICONS[toast.tone];
  useEffect(() => {
    const timer = setTimeout(onClose, toast.tone === 'erro' || toast.tone === 'warn' ? 8000 : 5000);
    return () => clearTimeout(timer);
  }, [toast.id, toast.tone, onClose]);
  return (
    <div className={`toast toast--${toast.tone}`}>
      <Icon className="toast__icon" size={18} aria-hidden />
      <div className="toast__text">
        <p className="toast__title">{toast.title}</p>
        {toast.detail ? <p className="toast__detail">{toast.detail}</p> : null}
      </div>
      <Button variant="ghost" size="sm" iconOnly icon={X} aria-label="Dispensar aviso" onClick={onClose} />
    </div>
  );
}

export function Toasts() {
  const actions = useActions();
  const toasts = useAppState((s) => s.toasts, Object.is);
  return (
    <div className="toasts" role="status" aria-live="polite" aria-relevant="additions">
      {toasts.map((toast) => (
        <ToastView key={toast.id} toast={toast} onClose={() => actions.dismissToast(toast.id)} />
      ))}
    </div>
  );
}
