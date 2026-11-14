import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2, type LucideIcon } from 'lucide-react';
import { Link, type LinkProps } from 'react-router-dom';
import './ui.css';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

interface Shared {
  variant?: Variant;
  size?: Size;
  icon?: LucideIcon;
  iconRight?: LucideIcon;
  loading?: boolean;
  iconOnly?: boolean;
}

function classes({ variant = 'secondary', size = 'md', iconOnly }: Shared, extra?: string) {
  return ['btn', `btn--${variant}`, size === 'sm' && 'btn--sm', iconOnly && 'btn--icon', extra].filter(Boolean).join(' ');
}

function Inner({ icon: Icon, iconRight: IconRight, loading, children, size }: Shared & { children?: ReactNode }) {
  const px = size === 'sm' ? 15 : 17;
  return (
    <>
      {loading ? <Loader2 className="spin" size={px} aria-hidden /> : Icon ? <Icon size={px} aria-hidden /> : null}
      {children}
      {IconRight ? <IconRight size={px} aria-hidden /> : null}
    </>
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & Shared>(function Button(
  { variant, size, icon, iconRight, loading, iconOnly, className, children, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={classes({ variant, size, iconOnly }, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      <Inner icon={icon} iconRight={iconRight} loading={loading} size={size}>
        {children}
      </Inner>
    </button>
  );
});

export function ButtonLink({
  variant,
  size,
  icon,
  iconRight,
  iconOnly,
  className,
  children,
  ...rest
}: LinkProps & Shared) {
  return (
    <Link className={classes({ variant, size, iconOnly }, className)} {...rest}>
      <Inner icon={icon} iconRight={iconRight} size={size}>
        {children}
      </Inner>
    </Link>
  );
}
