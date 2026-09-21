import { AlertTriangle, Bell, CircleAlert, X } from 'lucide-react'
import { useApp } from '../context'
import { cx } from '../lib/utils'

const TONE = {
  info: { icon: Bell, cls: 'text-accent' },
  warn: { icon: AlertTriangle, cls: 'text-warn' },
  danger: { icon: CircleAlert, cls: 'text-danger' },
}

export default function Toasts() {
  const { toasts, dismissToast } = useApp()
  return (
    <div className="pt-safe pointer-events-none fixed inset-x-0 top-0 z-[60] flex flex-col items-center gap-2 px-3 pt-3" aria-live="polite">
      {toasts.map((t) => {
        const { icon: Icon, cls } = TONE[t.tone] || TONE.info
        return (
          <div key={t.id} role="status" className="pointer-events-auto flex w-full max-w-md animate-toast items-start gap-3 rounded-xl border border-line bg-surface p-3.5 shadow-xl">
            <Icon className={cx('mt-0.5 h-5 w-5 shrink-0', cls)} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold leading-snug">{t.title}</p>
              {t.body && <p className="mt-0.5 text-[13px] leading-snug text-muted">{t.body}</p>}
            </div>
            <button onClick={() => dismissToast(t.id)} aria-label="Tutup" className="text-muted hover:text-ink"><X className="h-4 w-4" /></button>
          </div>
        )
      })}
    </div>
  )
}
