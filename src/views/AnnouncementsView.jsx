import { useEffect, useMemo, useRef, useState } from 'react'
import { Megaphone, Pin, PinOff, Plus, Trash2 } from 'lucide-react'
import { useApp } from '../context'
import { useNow } from '../hooks/useNow'
import { timeAgo } from '../lib/dates'
import { cx } from '../lib/utils'
import { Button, EmptyState, Field, inputCls } from '../components/ui'

export default function AnnouncementsView() {
  const { announcements, role, profile, saveAnnouncement, deleteAnnouncement, togglePin, annSeenAt, markAnnouncementsSeen } = useApp()
  const now = useNow(60000)
  const isKetua = role === 'ketua'
  const baseline = useRef(annSeenAt) // penanda "Baru" dihitung dari kunjungan sebelumnya
  const [composing, setComposing] = useState(false)
  const [form, setForm] = useState({ title: '', body: '', pinned: false })

  useEffect(() => {
    markAnnouncementsSeen()
  }, [announcements.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const sorted = useMemo(
    () => [...announcements].sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || new Date(b.createdAt) - new Date(a.createdAt)),
    [announcements]
  )

  const submit = (e) => {
    e.preventDefault()
    if (!form.title.trim() || !form.body.trim()) return
    saveAnnouncement({ title: form.title.trim(), body: form.body.trim(), pinned: form.pinned })
    setForm({ title: '', body: '', pinned: false })
    setComposing(false)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <h1 className="flex-1 text-2xl font-extrabold">Pengumuman</h1>
        {isKetua && !composing && (
          <Button onClick={() => setComposing(true)}><Plus className="h-4 w-4" />Buat pengumuman</Button>
        )}
      </div>

      {composing && (
        <form onSubmit={submit} className="space-y-3 rounded-xl border border-accent bg-surface p-4">
          <Field label="Judul">
            <input className={inputCls} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Contoh: Kuliah pengganti hari Jumat" autoFocus />
          </Field>
          <Field label="Isi pengumuman">
            <textarea className={inputCls + ' min-h-28 resize-y'} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
          </Field>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" className="h-4 w-4 accent-[rgb(var(--c-accent))]" checked={form.pinned} onChange={(e) => setForm({ ...form, pinned: e.target.checked })} />
            Sematkan di paling atas
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setComposing(false)}>Batal</Button>
            <Button type="submit" disabled={!form.title.trim() || !form.body.trim()}>Kirim pengumuman</Button>
          </div>
        </form>
      )}

      {sorted.length === 0 ? (
        <EmptyState icon={<Megaphone className="h-6 w-6" />} title="Belum ada pengumuman">
          {isKetua ? 'Kabar penting untuk kelas akan tampil di sini.' : 'Ketua Kelas belum mengirim pengumuman.'}
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {sorted.map((a) => {
            const isNew = a.createdBy !== profile.id && new Date(a.createdAt).getTime() > baseline.current
            return (
              <article key={a.id} className={cx('rounded-xl border bg-surface p-4', a.pinned ? 'border-accent' : 'border-line')}>
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2 text-xs font-semibold">
                      {a.pinned && <span className="inline-flex items-center gap-1 text-accent"><Pin className="h-3.5 w-3.5" />Disematkan</span>}
                      {isNew && <span className="rounded-md bg-accent px-1.5 py-0.5 text-accent-ink">Baru</span>}
                    </div>
                    <h2 className="text-lg font-extrabold leading-snug">{a.title}</h2>
                  </div>
                  {isKetua && (
                    <div className="flex shrink-0 gap-1">
                      <button onClick={() => togglePin(a)} aria-label={a.pinned ? 'Lepas sematan' : 'Sematkan'} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-sunken hover:text-ink">
                        {a.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => window.confirm('Hapus pengumuman ini?') && deleteAnnouncement(a.id)}
                        aria-label="Hapus pengumuman"
                        className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-danger/10 hover:text-danger"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
                <p className="mt-1.5 whitespace-pre-line text-[15px] leading-relaxed">{a.body}</p>
                <p className="mt-2.5 text-xs text-muted">{a.author || 'Ketua Kelas'}, {timeAgo(a.createdAt, now)}</p>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
