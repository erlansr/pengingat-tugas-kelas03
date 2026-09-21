import { useMemo, useState } from 'react'
import { CalendarX, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useApp } from '../context'
import { useNow } from '../hooks/useNow'
import { DAY_SHORT, MONTHS, buildMonthGrid, dayKey, formatLongDate, isSameDay, startOfDay } from '../lib/dates'
import { cx } from '../lib/utils'
import { Button, EmptyState } from '../components/ui'
import TaskCard from '../components/TaskCard'

export default function CalendarView() {
  const { tasks, role, isDone, setEditor } = useApp()
  const now = useNow()
  const today = new Date(now)
  const [cursor, setCursor] = useState({ y: today.getFullYear(), m: today.getMonth() })
  const [selected, setSelected] = useState(() => startOfDay(new Date()))

  const grid = useMemo(() => buildMonthGrid(cursor.y, cursor.m), [cursor])
  const byDay = useMemo(() => {
    const map = {}
    tasks.forEach((t) => {
      const k = dayKey(t.deadline)
      ;(map[k] = map[k] || []).push(t)
    })
    Object.values(map).forEach((l) => l.sort((a, b) => new Date(a.deadline) - new Date(b.deadline)))
    return map
  }, [tasks])

  const move = (delta) =>
    setCursor(({ y, m }) => {
      const d = new Date(y, m + delta, 1)
      return { y: d.getFullYear(), m: d.getMonth() }
    })
  const goToday = () => {
    setCursor({ y: today.getFullYear(), m: today.getMonth() })
    setSelected(startOfDay(today))
  }

  const dayTasks = byDay[dayKey(selected)] || []
  const isKetua = role === 'ketua'

  const dotTone = (t) => {
    if (!isKetua && isDone(t.id)) return 'bg-ok'
    if (new Date(t.deadline) < now) return 'bg-danger'
    return t.priority === 'high' ? 'bg-accent' : 'bg-muted'
  }

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-line bg-surface p-3 sm:p-4">
        <div className="mb-3 flex items-center gap-2">
          <h1 className="flex-1 text-lg font-extrabold sm:text-xl">{MONTHS[cursor.m]} {cursor.y}</h1>
          <Button size="sm" variant="soft" onClick={goToday}>Hari ini</Button>
          <button onClick={() => move(-1)} aria-label="Bulan sebelumnya" className="grid h-8 w-8 place-items-center rounded-lg bg-sunken hover:bg-line/70"><ChevronLeft className="h-4 w-4" /></button>
          <button onClick={() => move(1)} aria-label="Bulan berikutnya" className="grid h-8 w-8 place-items-center rounded-lg bg-sunken hover:bg-line/70"><ChevronRight className="h-4 w-4" /></button>
        </div>

        <div className="grid grid-cols-7 gap-px">
          {DAY_SHORT.map((d, i) => (
            <div key={d} className={cx('pb-1.5 text-center text-xs font-bold', i === 6 ? 'text-danger' : 'text-muted')}>{d}</div>
          ))}
          {grid.map((d) => {
            const items = byDay[dayKey(d)] || []
            const inMonth = d.getMonth() === cursor.m
            const isToday = isSameDay(d, today)
            const isSel = isSameDay(d, selected)
            return (
              <button
                key={d.toISOString()}
                onClick={() => setSelected(startOfDay(d))}
                aria-label={`${formatLongDate(d)}, ${items.length} tugas`}
                aria-pressed={isSel}
                className={cx(
                  'flex min-h-[3.4rem] flex-col items-start rounded-md border p-1 text-left transition sm:min-h-[4.6rem] sm:p-1.5',
                  isSel ? 'border-accent bg-accent/10' : 'border-transparent hover:bg-sunken',
                  !inMonth && 'opacity-40'
                )}
              >
                <span
                  className={cx(
                    'grid h-6 w-6 place-items-center rounded-full text-[13px] font-bold',
                    isToday ? 'bg-accent text-accent-ink' : d.getDay() === 0 ? 'text-danger' : 'text-ink'
                  )}
                >
                  {d.getDate()}
                </span>
                {items.length > 0 && (
                  <>
                    <span className="mt-auto flex flex-wrap items-center gap-0.5 sm:hidden">
                      {items.slice(0, 3).map((t) => <span key={t.id} className={cx('h-1.5 w-1.5 rounded-full', dotTone(t))} />)}
                    </span>
                    <span className="mt-1 hidden w-full space-y-0.5 sm:block">
                      {items.slice(0, 2).map((t) => (
                        <span key={t.id} className="flex items-center gap-1 text-[11px] font-medium leading-tight">
                          <span className={cx('h-1.5 w-1.5 shrink-0 rounded-full', dotTone(t))} />
                          <span className="truncate">{t.title}</span>
                        </span>
                      ))}
                      {items.length > 2 && <span className="block text-[11px] font-semibold text-muted">+{items.length - 2} lagi</span>}
                    </span>
                  </>
                )}
              </button>
            )
          })}
        </div>

        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-dashed border-line pt-3 text-xs text-muted">
          <li className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-accent" />Prioritas tinggi</li>
          <li className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-muted" />Tugas biasa</li>
          {!isKetua && <li className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-ok" />Selesai</li>}
          <li className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-danger" />Lewat tenggat</li>
        </ul>
      </section>

      <section aria-live="polite">
        <div className="mb-2 flex items-center gap-2">
          <h2 className="flex-1 text-lg font-extrabold">{formatLongDate(selected)}</h2>
          {isKetua && (
            <Button size="sm" variant="outline" onClick={() => setEditor({ defaultDate: selected })}>
              <Plus className="h-4 w-4" />Tambah tugas
            </Button>
          )}
        </div>
        {dayTasks.length === 0 ? (
          <EmptyState icon={<CalendarX className="h-6 w-6" />} title="Tidak ada tenggat di hari ini">
            Pilih tanggal lain yang bertanda titik.
          </EmptyState>
        ) : (
          <div className="space-y-2.5">{dayTasks.map((t) => <TaskCard key={t.id} task={t} now={now} />)}</div>
        )}
      </section>
    </div>
  )
}
