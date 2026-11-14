import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';
import './ui.css';

/** Diálogo modal sobre o elemento nativo <dialog>: foco preso, Esc e retorno do foco vêm de graça. */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    }
    if (!open && dialog.open) {
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={`dialog${wide ? ' dialog--wide' : ''}`}
      aria-labelledby="dialog-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      {open ? (
        <>
          <header className="dialog__head">
            <div>
              <h2 className="dialog__title" id="dialog-title">
                {title}
              </h2>
              {description ? <p className="dialog__desc">{description}</p> : null}
            </div>
            <Button variant="ghost" size="sm" iconOnly icon={X} aria-label="Fechar" onClick={onClose} />
          </header>
          <div className="dialog__body">{children}</div>
          {footer ? <footer className="dialog__foot">{footer}</footer> : null}
        </>
      ) : null}
    </dialog>
  );
}
