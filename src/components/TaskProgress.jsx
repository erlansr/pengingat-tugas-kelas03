import { useMemo, useState } from 'react'
import { Check, Copy, X } from 'lucide-react'
import { useApp } from '../context'
import { Button, Modal } from './ui'
import { formatDeadline } from '../lib/dates'

/** Rincian siapa saja yang sudah/belum mengumpulkan — khusus Ketua Kelas */
export default function TaskProgress() {
  const { detailTaskId, setDetailTaskId, tasks, students, completions, pushToast } = useApp()
  const task = tasks.find((t) => t.id === detailTaskId)
  const [copied, setCopied] = useState(false)

  const rows = useMemo(() => {
    if (!task) return []
    const doneIds = new Set(completions.filter((c) => c.taskId === task.id).map((c) => c.studentId))
    return students
      .map((s) => ({ ...s, done: doneIds.has(s.id) }))
      .sort((a, b) => Number(a.done) - Number(b.done) || a.name.localeCompare(b.name))
  }, [task, students, completions])

  const pending = rows.filter((r) => !r.done)

  const copyPending = async () => {
    const text = `Belum mengumpulkan "${task.title}" (tenggat ${formatDeadline(task.deadline)}):\n` +
      pending.map((r, i) => `${i + 1}. ${r.name}`).join('\n')
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      pushToast({ tone: 'danger', title: 'Tidak bisa menyalin', body: 'Izinkan akses papan klip di browser.' })
    }
  }

  return (
    <Modal
      open={!!task}
      onClose={() => setDetailTaskId(null)}
      title="Progres tugas"
      footer={
        <Button variant="outline" className="w-full" onClick={copyPending} disabled={!pending.length}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? 'Tersalin' : `Salin daftar yang belum (${pending.length}) untuk grup`}
        </Button>
      }
    >
      {task && (
        <>
          <p className="text-base font-bold leading-snug">{task.title}</p>
          <p className="mb-3 mt-0.5 text-sm text-muted">Tenggat {formatDeadline(task.deadline)}</p>
          {rows.length === 0 ? (
            <p className="rounded-lg bg-sunken px-3 py-4 text-center text-sm text-muted">
              Belum ada mahasiswa yang masuk ke aplikasi.
            </p>
          ) : (
            <ul className="divide-y divide-line rounded-lg border border-line">
              {rows.map((r) => (
                <li key={r.id} className="flex items-center gap-3 px-3 py-2.5">
                  <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${r.done ? 'bg-ok/15 text-ok' : 'bg-danger/10 text-danger'}`}>
                    {r.done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : <X className="h-3.5 w-3.5" strokeWidth={3} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{r.name}</span>
                    <span className="block text-xs text-muted">{r.nim}</span>
                  </span>
                  <span className={`text-xs font-semibold ${r.done ? 'text-ok' : 'text-danger'}`}>{r.done ? 'Selesai' : 'Belum'}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Modal>
  )
}
