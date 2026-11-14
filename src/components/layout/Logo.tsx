/** Símbolo próprio: placa vermelha com dois cantos chanfrados e um "A" de raia. */
export function LogoMark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden focusable="false">
      <path fill="#e32636" d="M0 0h23l9 9v23H9L0 23z" />
      <path fill="#fff" d="M16 6.5 24.5 25h-4.1l-1.5-3.6h-5.8L11.6 25H7.5zm0 7.6-1.8 4.4h3.6z" />
    </svg>
  );
}

export function Logo({ collapsed }: { collapsed?: boolean }) {
  return (
    <span className="logo">
      <LogoMark />
      {collapsed ? null : <span className="logo__word">TokArena</span>}
    </span>
  );
}
