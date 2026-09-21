import { useState } from 'react'
import { BarChart3, Bell, ChevronDown, Clock, Pencil, Trash2 } from 'lucide-react'
import { useApp } from '../context'
import { cx } from '../lib/utils'
import { formatDeadline, relativeDeadline } from '../lib/dates'
import { PRIORITY, TONE_TEXT } from '../lib/constants'
import { Button } from './ui'
import { showSystemNotification } from '../lib/notify'

export default function TaskCard({ task, now }) {
  const { role, isDone, toggleDone, setEditor, setDetailTaskId, progressByTask, students = [], deleteTask, store } = useApp()
  const [open, setOpen] = useState(false)
  const [sendingReminder, setSendingReminder] = useState(false)

  const isKetua = role === 'ketua'
  const done = !isKetua && isDone(task.id)
  const rel = relativeDeadline(task.deadline, now)
  const pr = PRIORITY[task.priority] || PRIORITY.medium
  const completed = progressByTask[task.id] || 0
  const pct = students.length ? Math.round((completed / students.length) * 100) : 0

  const onDelete = () => {
    if (window.confirm(`Hapus tugas "${task.title}"? Centang mahasiswa untuk tugas ini juga ikut terhapus.`)) deleteTask(task.id)
  }

  const onRemind = async () => {
    const customNote = window.prompt(`Kirim pengingat untuk tugas "${task.title}" ke semua mahasiswa?\n\nCatatan tambahan (opsional):`)
    if (customNote === null) return // Batal

    setSendingReminder(true)
    try {
      const nowIso = new Date().toISOString()
      const remId = 'rem-' + Date.now()

      // 1. Simpan ke koleksi 'announcements' agar muncul di tab Pengumuman
      const announcementData = {
        title: `⏰ PENGINGAT: ${task.title}`,
        body: customNote 
          ? `${customNote}\n\nMatakuliah: ${task.course || '-'}` 
          : `Jangan lupa kerjakan dan kumpulkan tugas ${task.course || ''} (${task.title})!`,
        pinned: true,
        createdBy: 'ketua-kelas',
        author: 'Ketua Kelas',
        createdAt: nowIso
      }
      await store.set('announcements', remId, announcementData)

      // 2. Simpan ke koleksi 'reminders' sebagai pemicu realtime listener
      const reminderData = {
        taskId: task.id,
        title: `⏰ Pengingat Tugas: ${task.title}`,
        body: customNote || `Matakuliah ${task.course || ''} - Selesaikannya sebelum deadline.`,
        createdAt: nowIso
      }
      await store.set('reminders', remId, reminderData)

      // 3. Pemicu lokal langsung untuk device Ketua Kelas sendiri
      showSystemNotification(reminderData.title, {
        body: reminderData.body,
        tag: remId
      })

      alert('✅ Pengingat berhasil disiarkan ke seluruh kelas!')
    } catch (err) {
      console.error('Gagal mengirim pengingat:', err)
      alert('❌ Gagal mengirim pengingat.')
    } finally {
      setSendingReminder(false)
    }
  }

  return (
    <article className={cx('rounded-xl border border-line bg-surface transition-colors', done && 'bg-surface/60')}>
      <div className="flex gap-3 p-4">
        {!isKetua && (
          <button
            type="button"
            role="checkbox"
            aria-checked={done}
            aria-label={done ? `Batalkan centang: ${task.title}` : `Tandai selesai: ${task.title}`}
            onClick={() => toggleDone(task.id)}
            className={cx(
              'mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md border-2 transition active:scale-90',
              done ? 'border-accent bg-accent text-accent-ink' : 'border-muted/50 hover:border-accent'
            )}
          >
            {done && (
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12.5l4.5 4.5L19 7" strokeDasharray="24" className="animate-tick" />
              </svg>
            )}
          </button>
        )}

        <div className="min-w-0 flex-1">
          <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="block w-full text-left">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold">
              {task.course && <span className="rounded-md bg-sunken px-2 py-0.5 text-ink">{task.course}</span>}
              <span className={cx('inline-flex items-center gap-1.5', pr.text)}>
                <span className={cx('h-2 w-2 rounded-full', pr.dot)} />
                Prioritas {pr.label.toLowerCase()}
              </span>
            </div>
            <h3
              className={cx(
                'mt-1.5 text-[17px] font-bold leading-snug',
                done && 'text-muted line-through decoration-accent decoration-2'
              )}
            >
              {task.title}
            </h3>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[13px]">
              <span className="inline-flex items-center gap-1.5 text-muted">
                <Clock className="h-3.5 w-3.5" />
                {formatDeadline(task.deadline)}
              </span>
              <span className={cx('font-semibold', done ? 'text-ok' : TONE_TEXT[rel.tone])}>
                {done ? 'Selesai' : rel.text}
              </span>
            </div>
          </button>

          {isKetua && (
            <div className="mt-3">
              <div className="mb-1 flex items-center justify-between text-xs font-semibold">
                <span className="text-muted">Sudah mengumpulkan</span>
                <span>{completed} dari {students.length} mahasiswa</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-sunken" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )}

          {open && (
            <div className="mt-3 border-t border-dashed border-line pt-3">
              <p className="whitespace-pre-line text-sm leading-relaxed">
                {task.description || <span className="text-muted">Tidak ada keterangan tambahan.</span>}
              </p>
              {isKetua && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => setDetailTaskId(task.id)}>
                    <BarChart3 className="h-4 w-4" />Progres
                  </Button>
                  <Button size="sm" variant="soft" onClick={onRemind} disabled={sendingReminder}>
                    <Bell className="h-4 w-4" />{sendingReminder ? 'Mengirim...' : 'Ingatkan'}
                  </Button>
                  <Button size="sm" variant="soft" onClick={() => setEditor({ task })}>
                    <Pencil className="h-4 w-4" />Ubah
                  </Button>
                  <Button size="sm" variant="danger" onClick={onDelete}>
                    <Trash2 className="h-4 w-4" />Hapus
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? 'Sembunyikan detail' : 'Tampilkan detail'}
          className="-mr-1 h-8 w-8 shrink-0 self-start rounded-lg text-muted hover:bg-sunken flex items-center justify-center"
        >
          <ChevronDown className={cx('h-5 w-5 transition-transform', open && 'rotate-180')} />
        </button>
      </div>
    </article>
  )
}
