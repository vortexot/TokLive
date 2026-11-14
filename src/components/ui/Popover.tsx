import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import './ui.css';

/** Botão + painel flutuante. Fecha com Esc, clique fora ou ao perder o foco por Tab. */
export function Popover({
  trigger,
  children,
  onToggle,
  align = 'right',
}: {
  trigger: (props: {
    open: boolean;
    toggle: () => void;
    ref: React.RefObject<HTMLButtonElement | null>;
    id: string;
  }) => ReactNode;
  children: (close: () => void) => ReactNode;
  onToggle?: (open: boolean) => void;
  align?: 'left' | 'right';
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const id = useId();

  const set = (value: boolean) => {
    setOpen(value);
    onToggle?.(value);
  };

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) set(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        set(false);
        button.current?.focus();
      }
    };
    const onFocusOut = (e: FocusEvent) => {
      if (e.relatedTarget && !root.current?.contains(e.relatedTarget as Node)) set(false);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    const el = root.current;
    el?.addEventListener('focusout', onFocusOut);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
      el?.removeEventListener('focusout', onFocusOut);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <div className="popover" ref={root}>
      {trigger({ open, toggle: () => set(!open), ref: button, id })}
      {open ? (
        <div className="popover__panel" id={id} style={align === 'left' ? { left: 0, right: 'auto' } : undefined}>
          {children(() => set(false))}
        </div>
      ) : null}
    </div>
  );
}
