import { useEffect, useRef } from 'react'
import { useApp } from '../context'
import { relativeDeadline } from '../lib/dates'
import { loadJSON, saveJSON } from '../lib/utils'
import { showSystemNotification } from '../lib/notify'

/**
 * Pengingat otomatis (Web Notification API).
 *  • Mahasiswa: notifikasi untuk tugas yang BELUM dicentang, pada H-1 hari / 3 jam / 1 jam
 *    (sesuai pengaturan). Jika beberapa ambang terlewat sekaligus, hanya satu yang dikirim.
 *  • Semua peran: notifikasi saat pengumuman baru dari orang lain masuk.
 * Berjalan selama aplikasi terbuka (termasuk di latar belakang). Untuk notifikasi saat aplikasi
 * benar-benar tertutup dibutuhkan Web Push (FCM) + server — lihat README.
 */
export function useReminders() {
  const { profile, tasks, isDone, reminders, announcements, annLoaded, pushToast } = useApp()

  const notify = (title, body, tag) => {
    pushToast({ tone: 'warn', title, body })
    showSystemNotification(title, { body, tag, renotify: false })
  }

  // simpan versi terbaru agar interval tidak perlu dibuat ulang tiap render
  const latest = useRef()
  latest.current = { profile, tasks, isDone, reminders, notify }

  useEffect(() => {
    if (profile?.role !== 'mahasiswa') return
    const key = `ctr:notified:${profile.id}`

    const check = () => {
      const { tasks, isDone, reminders, notify } = latest.current
      if (!reminders.enabled) return
      const now = Date.now()
      const sent = loadJSON(key, {})
      let changed = false

      for (const t of tasks) {
        if (isDone(t.id)) continue
        const dl = new Date(t.deadline).getTime()
        if (!(dl > now)) continue
        const passed = reminders.leads.filter((L) => now >= dl - L * 60000)
        if (!passed.length) continue
        const tightest = Math.min(...passed)
        if (sent[`${t.id}:${dl}:${tightest}`]) continue

        passed.forEach((L) => (sent[`${t.id}:${dl}:${L}`] = now))
        changed = true
        const rel = relativeDeadline(t.deadline, now)
        notify(`Tugas ${rel.text}`, `${t.title}${t.course ? ` (${t.course})` : ''}`, `task-${t.id}`)
      }

      if (changed) {
        // buang catatan lama (> 60 hari) agar tidak menumpuk
        Object.keys(sent).forEach((k) => now - sent[k] > 60 * 864e5 && delete sent[k])
        saveJSON(key, sent)
      }
    }

    check()
    const timer = setInterval(check, 30000)
    const onVisible = () => document.visibilityState === 'visible' && check()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
    // jalankan ulang bila daftar tugas / status centang / pengaturan berubah
  }, [profile?.id, profile?.role, tasks, isDone, reminders])

  /* pengumuman baru */
  const knownAnn = useRef(null)
  useEffect(() => {
    if (!annLoaded || !profile) return
    if (knownAnn.current === null) {
      knownAnn.current = new Set(announcements.map((a) => a.id))
      return
    }
    announcements.forEach((a) => {
      if (knownAnn.current.has(a.id)) return
      knownAnn.current.add(a.id)
      if (a.createdBy !== profile.id) latest.current.notify(`Pengumuman: ${a.title}`, a.body?.slice(0, 120), `ann-${a.id}`)
    })
  }, [announcements, annLoaded, profile])
}
