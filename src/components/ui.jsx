import { useEffect } from 'react'
import { X } from 'lucide-react'
import { cx } from '../lib/utils'

export const inputCls =
  'w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-[15px] text-ink placeholder:text-muted/70 ' +
  'outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/25'

const BTN = {
  primary: 'bg-accent text-accent-ink hover:brightness-110 active:brightness-95 disabled:opacity-50',
  soft: 'bg-sunken text-ink hover:bg-line/70',
  outline: 'border border-line bg-surface text-ink hover:border-accent hover:text-accent',
  ghost: 'text-muted hover:bg-sunken hover:text-ink',
  danger: 'bg-danger/10 text-danger hover:bg-danger/20',
}
const SIZE = { sm: 'h-8 px-3 text-[13px] gap-1.5', md: 'h-10 px-4 text-sm gap-2', lg: 'h-12 px-5 text-[15px] gap-2' }

export function Button({ variant = 'primary', size = 'md', className, ...props }) {
  return (
    <button
      {...props}
      className={cx(
        'inline-flex items-center justify-center rounded-lg font-semibold transition active:scale-[.98] disabled:cursor-not-allowed',
        BTN[variant], SIZE[size], className
      )}
    />
  )
}

export function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-semibold text-ink">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  )
}

export function Segmented({ value, onChange, options, className }) {
  return (
    <div role="radiogroup" className={cx('flex rounded-lg bg-sunken p-1', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            'flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-semibold transition',
            value === o.value ? 'bg-surface text-ink shadow-sm ring-1 ring-line' : 'text-muted hover:text-ink'
          )}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cx('relative h-6 w-11 shrink-0 rounded-full transition', checked ? 'bg-accent' : 'bg-line')}
    >
      <span
        className={cx(
          'absolute top-0.5 h-5 w-5 rounded-full shadow transition-all',
          checked ? 'left-[22px] bg-accent-ink' : 'left-0.5 bg-surface'
        )}
      />
    </button>
  )
}

export function Modal({ open, onClose, title, children, footer, wide }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 animate-fade bg-black/50" onClick={onClose} />
      <div
        className={cx(
          'relative flex max-h-[92dvh] w-full animate-sheet flex-col overflow-hidden rounded-t-2xl border border-line bg-surface shadow-2xl sm:rounded-2xl',
          wide ? 'sm:max-w-2xl' : 'sm:max-w-md'
        )}
      >
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} aria-label="Tutup" className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-sunken hover:text-ink">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="pb-safe border-t border-line bg-sunken/50 px-5 py-3">{footer}</div>}
      </div>
    </div>
  )
}

export function EmptyState({ icon, title, children, action }) {
  return (
    <div className="rounded-xl border border-dashed border-line bg-surface/70 px-6 py-10 text-center">
      <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-sunken text-muted">{icon}</div>
      <p className="font-display text-lg font-bold">{title}</p>
      {children && <p className="mx-auto mt-1 max-w-xs text-sm text-muted">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function ProgressRing({ value, size = 64, stroke = 7, children }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-line" />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} strokeLinecap="round"
          className="stroke-accent transition-[stroke-dashoffset] duration-500"
          strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(1, Math.max(0, value)))}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-sm font-bold">{children}</div>
    </div>
  )
}

export function Logo({ className = 'h-9 w-9' }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="14" className="fill-accent" />
      <rect x="14" y="10" width="36" height="44" rx="4" className="fill-surface" />
      <path d="M22 10v44M25 10v44" className="stroke-danger" strokeWidth="1.6" />
      <path d="M31 33l5.5 5.5L46 27" fill="none" className="stroke-accent" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
