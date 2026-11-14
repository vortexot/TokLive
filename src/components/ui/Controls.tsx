import {
  useId,
  useRef,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { AlertCircle, Search, type LucideIcon } from 'lucide-react';
import './ui.css';

/* ---------- Campo de texto ---------- */

interface FieldShell {
  label: string;
  hint?: string;
  error?: string | null;
  hideLabel?: boolean;
}

export function TextField({
  label,
  hint,
  error,
  hideLabel,
  prefix,
  icon: Icon,
  className,
  ...rest
}: FieldShell & InputHTMLAttributes<HTMLInputElement> & { prefix?: string; icon?: LucideIcon }) {
  const id = useId();
  const describedBy = [hint ? `${id}-hint` : '', error ? `${id}-err` : ''].filter(Boolean).join(' ') || undefined;
  return (
    <div className="field">
      <label className={hideLabel ? 'sr-only' : 'field__label'} htmlFor={id}>
        {label}
      </label>
      <div className={`input-wrap${prefix ? ' input-wrap--prefix' : ''}${Icon ? ' input-wrap--icon' : ''}`}>
        {Icon ? <Icon size={16} aria-hidden /> : null}
        {prefix ? <span className="input-prefix" aria-hidden>{prefix}</span> : null}
        <input
          id={id}
          className={`input${className ? ` ${className}` : ''}`}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          {...rest}
        />
      </div>
      {hint && !error ? (
        <p className="field__hint" id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className="field__error" id={`${id}-err`} role="alert">
          <AlertCircle size={14} aria-hidden />
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Campo de texto com várias linhas, com o mesmo rótulo, dica e erro do TextField. */
export function TextAreaField({
  label,
  hint,
  error,
  hideLabel,
  className,
  ...rest
}: FieldShell & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  const describedBy = [hint ? `${id}-hint` : '', error ? `${id}-err` : ''].filter(Boolean).join(' ') || undefined;
  return (
    <div className="field">
      <label className={hideLabel ? 'sr-only' : 'field__label'} htmlFor={id}>
        {label}
      </label>
      <textarea
        id={id}
        className={`input input--area${className ? ` ${className}` : ''}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...rest}
      />
      {hint && !error ? (
        <p className="field__hint" id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className="field__error" id={`${id}-err`} role="alert">
          <AlertCircle size={14} aria-hidden />
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function SearchField({
  label,
  ...rest
}: { label: string } & Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  return <TextField label={label} hideLabel icon={Search} type="search" autoComplete="off" {...rest} />;
}

export function SelectField({
  label,
  hideLabel,
  hint,
  children,
  ...rest
}: FieldShell & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  return (
    <div className="field">
      <label className={hideLabel ? 'sr-only' : 'field__label'} htmlFor={id}>
        {label}
      </label>
      <select id={id} className="input" {...rest}>
        {children}
      </select>
      {hint ? <p className="field__hint">{hint}</p> : null}
    </div>
  );
}

/* ---------- Segmentado (rádios nativos: setas funcionam sem código extra) ---------- */

export interface SegmentOption<T extends string | number> {
  value: T;
  label: string;
  disabled?: boolean;
}

export function Segmented<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: SegmentOption<T>[];
  onChange: (value: T) => void;
}) {
  const name = useId();
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((option) => (
        <label className="segmented__item" key={String(option.value)}>
          <input
            type="radio"
            name={name}
            value={String(option.value)}
            checked={option.value === value}
            disabled={option.disabled}
            onChange={() => onChange(option.value)}
          />
          <span>{option.label}</span>
        </label>
      ))}
    </div>
  );
}

/* ---------- Abas ---------- */

export interface TabOption<T extends string> {
  value: T;
  label: string;
}

export function Tabs<T extends string>({
  label,
  value,
  options,
  onChange,
  panelId,
}: {
  label: string;
  value: T;
  options: TabOption<T>[];
  onChange: (value: T) => void;
  panelId: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (event: KeyboardEvent, index: number) => {
    const last = options.length - 1;
    let next = index;
    if (event.key === 'ArrowRight') next = index === last ? 0 : index + 1;
    else if (event.key === 'ArrowLeft') next = index === 0 ? last : index - 1;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = last;
    else return;
    event.preventDefault();
    onChange(options[next]!.value);
    refs.current[next]?.focus();
  };
  return (
    <div className="tabs" role="tablist" aria-label={label}>
      {options.map((option, i) => (
        <button
          key={option.value}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="button"
          role="tab"
          id={`${panelId}-tab-${option.value}`}
          aria-selected={option.value === value}
          aria-controls={panelId}
          tabIndex={option.value === value ? 0 : -1}
          className="tabs__tab"
          onClick={() => onChange(option.value)}
          onKeyDown={(e) => onKey(e, i)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- Switch ---------- */

export function SwitchRow({
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="switch-row">
      <div className="switch-row__text">
        <span className="switch-row__label" id={`${id}-l`}>
          {label}
        </span>
        {hint ? (
          <span className="switch-row__hint" id={`${id}-h`}>
            {hint}
          </span>
        ) : null}
      </div>
      <button
        type="button"
        role="switch"
        className="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-l`}
        aria-describedby={hint ? `${id}-h` : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
      />
    </div>
  );
}

/* ---------- Slider ---------- */

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  hint,
  format = (v) => String(v),
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  hint?: ReactNode;
  format?: (value: number) => string;
}) {
  const id = useId();
  const fill = `${((value - min) / (max - min)) * 100}%`;
  return (
    <div className="slider">
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      <div className="slider__row">
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          style={{ ['--fill' as string]: fill }}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        <output className="slider__value" htmlFor={id}>
          {format(value)}
        </output>
      </div>
      {hint ? <p className="field__hint">{hint}</p> : null}
    </div>
  );
}
