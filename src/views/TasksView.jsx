import { useMemo, useState } from 'react'
import { ClipboardCheck, Plus, Search } from 'lucide-react'
import { useApp } from '../context'
import { useNow } from '../hooks/useNow'
import { startOfDay } from '../lib/dates'
import { cx } from '../lib/utils'
import { Button, EmptyState, ProgressRing } from '../components/ui'
import TaskCard from '../components/TaskCard'

function bucket(task, now) {
  const dl = new Date(task.deadline).getTime()
  if (dl < now) return 'late'
  const diff = Math.round((startOfDay(dl) - startOfDay(now)) / 864e5)
  if (diff === 0) return 'today'
  if (diff <= 7) return 'week'
  return 'later'
}

export default function TasksView() {
  const { role, tasks, isDone, students, progressByTask, setEditor, profile } = useApp()
  const now = useNow()
  const isKetua = role === 'ketua'
  const [filter, setFilter] = useState('all')
  const [q, setQ] = useState('')

  const rows = useMemo(
    () => tasks.map((t) => ({ t, done: !isKetua && isDone(t.id), late: new Date(t.deadline).getTime() < now })),
    [tasks, isDone, isKetua, now]
  )

  const filters = isKetua
    ? [['all', 'Semua'], ['active', 'Aktif'], ['past', 'Sudah lewat']]
    : [['all', 'Semua'], ['todo', 'Belum'], ['late', 'Terlambat'], ['done', 'Selesai']]

  const groups = useMemo(() => {
    const match = ({ t, done, late }) => {
      if (q && !`${t.title} ${t.course}`.toLowerCase().includes(q.toLowerCase())) return false
      switch (filter) {
        case 'todo': return !done && !late
        case 'late': return !done && late
        case 'done': return done
        case 'active': return !late
        case 'past': return late
        default: return true
      }
    }
    const g = { late: [], today: [], week: [], later: [], done: [] }
    rows.filter(match).forEach((r) => (r.done ? g.done : g[bucket(r.t, now)]).push(r))
    const asc = (a, b) => new Date(a.t.deadline) - new Date(b.t.deadline)
    g.late.sort((a, b) => asc(b, a))
    g.done.sort((a, b) => asc(b, a))
    ;['today', 'week', 'later'].forEach((k) => g[k].sort(asc))
    return g
  }, [rows, filter, q, now])

  const labels = {
    late: isKetua ? 'Sudah lewat' : 'Terlambat',
    today: 'Hari ini',
    week: '7 hari ke depan',
    later: 'Selanjutnya',
    done: 'Selesai',
  }
  const visible = Object.entries(groups).filter(([, v]) => v.length)

  /* ringkasan */
  const total = tasks.length
  const doneCount = rows.filter((r) => r.done).length
  const lateCount = rows.filter((r) => !r.done && r.late).length
  const soonCount = rows.filter((r) => !r.done && !r.late && new Date(r.t.deadline) - now < 48 * 3600e3).length
  const activeTasks = tasks.filter((t) => new Date(t.deadline) >= now)
  const classAvg =
    students.length && activeTasks.length
      ? activeTasks.reduce((s, t) => s + (progressByTask[t.id] || 0), 0) / (students.length * activeTasks.length)
      : 0

  return (
    <div className="space-y-5">
      <section className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-xl border border-line bg-surface p-4">
        {isKetua ? (
          <>
            <ProgressRing value={classAvg}>{Math.round(classAvg * 100)}%</ProgressRing>
            <div className="min-w-[9rem] flex-1">
              <h1 className="text-xl font-extrabold leading-tight">Halo, {profile.name.split(' ')[0]}</h1>
              <p className="text-sm text-muted">Rata-rata pengumpulan tugas aktif di kelas.</p>
            </div>
            <dl className="flex w-full gap-6 border-t border-dashed border-line pt-3 sm:w-auto sm:border-0 sm:pt-0 sm:text-right">
              <Stat label="Tugas aktif" value={activeTasks.length} />
              <Stat label="Mahasiswa" value={students.length} />
            </dl>
          </>
        ) : (
          <>
            <ProgressRing value={total ? doneCount / total : 0}>{doneCount}/{total}</ProgressRing>
            <div className="min-w-[9rem] flex-1">
              <h1 className="text-xl font-extrabold leading-tight">Halo, {profile.name.split(' ')[0]}</h1>
              <p className="text-sm text-muted">
                {total === 0 ? 'Belum ada tugas dari Ketua Kelas.' : doneCount === total ? 'Semua tugas sudah selesai. Kerja bagus!' : `${total - doneCount} tugas belum selesai.`}
              </p>
            </div>
            <dl className="flex w-full gap-6 border-t border-dashed border-line pt-3 sm:w-auto sm:border-0 sm:pt-0 sm:text-right">
              <Stat label="Terlambat" value={lateCount} tone={lateCount ? 'text-danger' : ''} />
              <Stat label="Dekat (48 jam)" value={soonCount} tone={soonCount ? 'text-warn' : ''} />
            </dl>
          </>
        )}
      </section>

      <div className="flex flex-wrap items-center gap-2">
        <div className="scroll-hide -mx-1 flex flex-1 gap-1.5 overflow-x-auto px-1" role="tablist" aria-label="Filter tugas">
          {filters.map(([k, label]) => (
            <button
              key={k}
              role="tab"
              aria-selected={filter === k}
              onClick={() => setFilter(k)}
              className={cx(
                'shrink-0 rounded-lg px-3.5 py-1.5 text-[13px] font-semibold transition',
                filter === k ? 'bg-ink text-paper' : 'bg-surface text-muted ring-1 ring-line hover:text-ink'
              )}
            >
              {label}
            </button>
          ))}
        </div>
        {isKetua && (
          <Button onClick={() => setEditor({})}>
            <Plus className="h-4 w-4" />Tugas baru
          </Button>
        )}
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari judul atau mata kuliah"
          aria-label="Cari tugas"
          className="h-10 w-full rounded-lg border border-line bg-surface pl-9 pr-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
        />
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={<ClipboardCheck className="h-6 w-6" />}
          title={tasks.length ? 'Tidak ada tugas yang cocok' : 'Belum ada tugas'}
          action={isKetua && !tasks.length && <Button onClick={() => setEditor({})}><Plus className="h-4 w-4" />Buat tugas pertama</Button>}
        >
          {tasks.length ? 'Ubah filter atau kata kunci pencarian.' : isKetua ? 'Tambahkan tugas agar mahasiswa bisa mencentangnya.' : 'Tugas dari Ketua Kelas akan muncul di sini.'}
        </EmptyState>
      ) : (
        visible.map(([key, items]) => (
          <section key={key} aria-label={labels[key]}>
            <h2 className={cx('mb-2 flex items-baseline gap-2 text-lg font-extrabold', key === 'late' && 'text-danger')}>
              {labels[key]}
              <span className="text-sm font-semibold text-muted">{items.length}</span>
            </h2>
            <div className="space-y-2.5">
              {items.map(({ t }) => <TaskCard key={t.id} task={t} now={now} />)}
            </div>
          </section>
        ))
      )}
    </div>
  )
}

function Stat({ label, value, tone = '' }) {
  return (
    <div>
      <dd className={cx('font-display text-2xl font-extrabold leading-none', tone)}>{value}</dd>
      <dt className="mt-1 text-xs text-muted">{label}</dt>
    </div>
  )
}
