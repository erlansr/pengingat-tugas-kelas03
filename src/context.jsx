import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { createFirebaseStore, createLocalStore, isFirebaseConfigured, resetLocal, seedLocal } from './lib/store'
import { KETUA_PIN } from './lib/constants'
import { loadJSON, saveJSON, slug, uid } from './lib/utils'
import { readNotifPermission, requestNotifPermission } from './lib/notify'
import { fetchCeloeCalendar } from './lib/celoe.js'

const Ctx = createContext(null)
export const useApp = () => useContext(Ctx)

/* ───────── Tema: terang / gelap / ikuti sistem ───────── */
function useTheme() {
  const [mode, setModeState] = useState(() => localStorage.getItem('ctr:theme') || 'system')
  const [systemDark, setSystemDark] = useState(() => matchMedia('(prefers-color-scheme: dark)').matches)

  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const h = (e) => setSystemDark(e.matches)
    mq.addEventListener('change', h)
    return () => mq.removeEventListener('change', h)
  }, [])

  const dark = mode === 'dark' || (mode === 'system' && systemDark)
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0E1B1B' : '#F8FAFC')
  }, [dark])

  const setMode = (m) => {
    setModeState(m)
    localStorage.setItem('ctr:theme', m)
  }
  return { mode, dark, setMode }
}

export function AppProvider({ children }) {
  const theme = useTheme()

  const [store, setStore] = useState(null)
  const storeRef = useRef(null)
  const [profile, setProfile] = useState(() => loadJSON('ctr:profile', null))
  const [tasks, setTasks] = useState([])
  const [celoeTasks, setCeloeTasks] = useState([])
  const [celoeCalendarUrl, setCeloeCalendarUrlState] = useState(() => {
    const savedProfile = loadJSON('ctr:profile', null)
    return savedProfile?.id ? localStorage.getItem('ctr:celoe:url:' + savedProfile.id) || '' : ''
  })
  const [celoeSyncing, setCeloeSyncing] = useState(false)
  const [celoeLastSync, setCeloeLastSync] = useState(null)
  const [announcements, setAnnouncements] = useState([])
  const [annLoaded, setAnnLoaded] = useState(false)
  const [students, setStudents] = useState([])
  const [completions, setCompletions] = useState([])
  const [toasts, setToasts] = useState([])
  const [online, setOnline] = useState(navigator.onLine)

  // state UI bersama
  const [editor, setEditor] = useState(null) // { task?, defaultDate? }
  const [detailTaskId, setDetailTaskId] = useState(null)
  const [guideOpen, setGuideOpen] = useState(false)

  // pengaturan pengingat & izin notifikasi
  const [reminders, setRemindersState] = useState(() => loadJSON('ctr:reminders', { enabled: true, leads: [1440, 180, 60] }))
  const [permission, setPermission] = useState(readNotifPermission)
  const setReminders = (patch) =>
    setRemindersState((cur) => {
      const next = { ...cur, ...patch }
      saveJSON('ctr:reminders', next)
      return next
    })

  const [annSeen, setAnnSeen] = useState(() => loadJSON('ctr:annSeen', {}))

  /* ───── toast ───── */
  const pushToast = useCallback((toast) => {
    const id = uid()
    setToasts((t) => [...t.slice(-3), { id, tone: 'info', ...toast }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), toast.duration ?? 6000)
  }, [])
  const dismissToast = (id) => setToasts((t) => t.filter((x) => x.id !== id))

  /* ───── online / offline ───── */
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  /* ───── pilih adapter data: Firebase → cadangan lokal ───── */
  const fallbackToLocal = useCallback((reason) => {
    seedLocal()
    const s = { ...createLocalStore(), fallback: true }
    storeRef.current = s
    setStore(s)
    pushToast({ tone: 'warn', title: 'Memakai data lokal', body: reason, duration: 9000 })
  }, [pushToast])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!isFirebaseConfigured) {
        seedLocal()
        const s = createLocalStore()
        storeRef.current = s
        if (!cancelled) setStore(s)
        return
      }
      try {
        const s = await createFirebaseStore()
        storeRef.current = s
        if (!cancelled) setStore(s)
      } catch (err) {
        console.warn('[store] Firebase gagal, beralih ke lokal:', err)
        if (!cancelled) fallbackToLocal('Firebase tidak bisa dihubungi. Data hanya tersimpan di perangkat ini.')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [fallbackToLocal])

  const onStoreError = useCallback((err) => {
    console.error('[store] snapshot error:', err)
    if (storeRef.current?.mode === 'firebase') {
      fallbackToLocal('Sinkronisasi Firebase ditolak (cek aturan Firestore). Data hanya tersimpan di perangkat ini.')
    }
  }, [fallbackToLocal])

  // Data CeLOE bersifat pribadi: simpan Calendar URL dan hasil impor per profil, bukan di Firestore kelas.
  useEffect(() => {
    if (!profile?.id) {
      setCeloeTasks([])
      setCeloeCalendarUrlState('')
      setCeloeLastSync(null)
      return
    }
    setCeloeCalendarUrlState(localStorage.getItem('ctr:celoe:url:' + profile.id) || '')
    setCeloeTasks(loadJSON('ctr:celoe:events:' + profile.id, []))
    setCeloeLastSync(loadJSON('ctr:celoe:lastSync:' + profile.id, null))
  }, [profile?.id])

  const importCeloeTimeline = useCallback(async (rawJson) => {
    if (profile?.role !== 'ketua') throw new Error('Impor Timeline hanya bisa dilakukan oleh Ketua Kelas.')
    if (store?.mode !== 'firebase') throw new Error('Firebase belum aktif. Impor bersama memerlukan Firebase.')
    let payload
    try { payload = JSON.parse(rawJson) } catch {
      throw new Error('JSON Timeline tidak valid. Salin respons JSON lengkap dari CeLOE.')
    }
    const roots = Array.isArray(payload) ? payload : [payload]
    const events = roots.flatMap((root) => root?.data?.events || root?.events || [])
    if (!events.length) throw new Error('Tidak ditemukan daftar events pada JSON. Pastikan yang ditempel adalah respons Timeline CeLOE.')
    const deadlines = events.filter((event) =>
      event && (event.eventtype === 'close' || /\b(closes|deadline|due)\b/i.test(event.name || event.activitystr || '')) &&
      Number.isFinite(Number(event.timestart || event.timesort)) &&
      (event.activityname || event.name)
    )
    if (!deadlines.length) throw new Error('Tidak ada event tenggat yang cocok. Pastikan respons Timeline memuat eventtype close.')
    let importedCount = 0
    for (const event of deadlines) {
      const timestamp = Number(event.timestart || event.timesort)
      const deadline = new Date(timestamp * 1000)
      if (Number.isNaN(deadline.getTime())) continue
      const title = String(event.activityname || event.name || 'Tugas CeLOE').replace(/\s+(closes|deadline|due)$/i, '').trim().slice(0, 200)
      const course = String(event.course?.fullname || event.course?.shortname || 'CeLOE').slice(0, 160)
      const id = 'celoe-timeline-' + String(event.id || (course + '-' + title + '-' + timestamp)).replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 140)
      await store.set('tasks', id, {
        title, course,
        description: 'Tenggat diimpor dari Timeline CeLOE. Data diperbarui saat Ketua Kelas mengimpor ulang respons Timeline.',
        deadline: deadline.toISOString(), priority: 'medium', source: 'celoe-timeline',
        sourceEventId: String(event.id || ''),
        sourceUrl: typeof event.url === 'string' && event.url.startsWith('https://lms.telkomuniversity.ac.id/') ? event.url : '',
        createdBy: profile.id, updatedAt: new Date().toISOString(),
      })
      importedCount++
    }
    if (!importedCount) throw new Error('Tidak ada deadline valid yang berhasil diimpor.')
    return importedCount
  }, [profile, store])

  const saveCeloeCalendarUrl = useCallback((url) => {
    const clean = url.trim()
    setCeloeCalendarUrlState(clean)
    if (profile?.id) {
      const key = 'ctr:celoe:url:' + profile.id
      if (clean) localStorage.setItem(key, clean)
      else localStorage.removeItem(key)
    }
  }, [profile?.id])

  const syncCeloeCalendar = useCallback(async ({ silent = false, calendarUrl = '' } = {}) => {
    if (!profile?.id) throw new Error('Masuk ke aplikasi terlebih dahulu.')
    if (store?.mode !== 'firebase') throw new Error('Firebase belum aktif. Sinkronisasi CeLOE memerlukan Firebase Auth.')
    const urlToSync = (calendarUrl || celoeCalendarUrl).trim()
    if (!urlToSync) throw new Error('Masukkan Calendar URL CeLOE di Pengaturan.')
    if (!online) throw new Error('Perangkat sedang offline.')

    setCeloeSyncing(true)
    try {
      const result = await fetchCeloeCalendar(urlToSync)
      const imported = result.events.map((event) => ({
        ...event,
        source: 'celoe',
        priority: 'medium',
        createdBy: 'celoe-import',
        createdAt: result.syncedAt,
        updatedAt: result.syncedAt,
      }))
      saveJSON('ctr:celoe:events:' + profile.id, imported)
      setCeloeTasks(imported)
      saveJSON('ctr:celoe:lastSync:' + profile.id, result.syncedAt)
      setCeloeLastSync(result.syncedAt)
      if (!silent) pushToast({ tone: 'info', title: 'Kalender CeLOE tersinkron', body: imported.length + ' acara diperbarui.' })
      return imported
    } catch (error) {
      if (!silent) pushToast({ tone: 'danger', title: 'Sinkronisasi LMS gagal', body: error.message || 'Coba lagi.' })
      throw error
    } finally {
      setCeloeSyncing(false)
    }
  }, [profile?.id, store?.mode, celoeCalendarUrl, online, pushToast])

  // Sinkronkan saat aplikasi dibuka/kembali aktif dan per 5 menit ketika tab terlihat.
  useEffect(() => {
    if (!profile?.id || !celoeCalendarUrl || store?.mode !== 'firebase' || !online) return
    let active = true
    let running = false
    const syncSilently = () => {
      if (!active || running || document.visibilityState !== 'visible') return
      running = true
      syncCeloeCalendar({ silent: true }).catch(() => {}).finally(() => { running = false })
    }
    syncSilently()
    const timer = setInterval(syncSilently, 5 * 60 * 1000)
    document.addEventListener('visibilitychange', syncSilently)
    return () => {
      active = false
      clearInterval(timer)
      document.removeEventListener('visibilitychange', syncSilently)
    }
  }, [profile?.id, celoeCalendarUrl, store?.mode, online, syncCeloeCalendar])

  /* ───── langganan realtime ───── */
  useEffect(() => {
    if (!store) return
    const opt = { onError: onStoreError }
    const unsubs = [
      store.subscribe('tasks', setTasks, opt),
      store.subscribe('announcements', (d) => { setAnnouncements(d); setAnnLoaded(true) }, opt),
    ]
    if (profile?.role === 'ketua') {
      unsubs.push(store.subscribe('students', setStudents, opt))
      unsubs.push(store.subscribe('completions', setCompletions, opt))
    } else if (profile?.role === 'mahasiswa') {
      unsubs.push(store.subscribe('completions', setCompletions, { ...opt, where: ['studentId', '==', profile.id] }))
    }
    return () => unsubs.forEach((u) => u())
  }, [store, profile?.id, profile?.role, onStoreError])

  /* ───── helper tulis: tidak di-await (aman saat offline) ───── */
  const run = useCallback((p) => {
    Promise.resolve(p).catch((err) => {
      console.error(err)
      pushToast({ tone: 'danger', title: 'Gagal menyimpan', body: 'Perubahan belum tersimpan. Coba lagi.' })
    })
  }, [pushToast])

  /* ───── auth terverifikasi (hanya NIM terdaftar) ───── */
  const login = useCallback(async ({ role, name, nim, pin }) => {
    if (!store) throw new Error('Sistem belum siap. Coba beberapa detik lagi.')

    if (role === 'ketua') {
      const cleanName = name.trim()
      if (!cleanName) throw new Error('Nama wajib diisi.')
      if (pin !== KETUA_PIN) throw new Error('PIN Ketua Kelas salah.')
      
      const p = { role, name: cleanName, id: `ketua-${slug(cleanName) || 'kelas'}` }
      saveJSON('ctr:profile', p)
      setProfile(p)
      return
    }

    // Role Mahasiswa
    const cleanNim = nim ? nim.trim() : ''
    if (!cleanNim) throw new Error('NIM wajib diisi.')

    const studentId = `mhs-${cleanNim}`
    
    // Verifikasi keberadaan data di koleksi students
    const existingStudent = await store.get('students', studentId)

    if (!existingStudent) {
      throw new Error('NIM Anda belum terdaftar. Silakan hubungi Ketua Kelas.')
    }

    // Ambil data profil resmi dari database
    const p = {
      role: 'mahasiswa',
      name: existingStudent.name,
      nim: existingStudent.nim,
      id: existingStudent.id
    }

    saveJSON('ctr:profile', p)
    setProfile(p)
  }, [store])

  const logout = useCallback(() => {
    localStorage.removeItem('ctr:profile')
    setProfile(null)
    setCompletions([])
    setStudents([])
  }, [])

  /* ───── checklist pribadi ───── */
  const doneSet = useMemo(
    () => new Set(completions.filter((c) => c.studentId === profile?.id).map((c) => c.taskId)),
    [completions, profile?.id]
  )
  const isDone = useCallback((taskId) => doneSet.has(taskId), [doneSet])

  const toggleDone = useCallback((taskId) => {
    if (!store || profile?.role !== 'mahasiswa') return
    const id = `${profile.id}_${taskId}`
    if (doneSet.has(taskId)) run(store.remove('completions', id))
    else run(store.set('completions', id, { studentId: profile.id, taskId, doneAt: new Date().toISOString() }))
  }, [store, profile, doneSet, run])

  /* ───── progres kelas (untuk Ketua) ───── */
  const progressByTask = useMemo(() => {
    const ids = new Set(students.map((s) => s.id))
    const map = {}
    completions.forEach((c) => {
      if (ids.has(c.studentId)) map[c.taskId] = (map[c.taskId] || 0) + 1
    })
    return map
  }, [students, completions])

  /* ───── tugas ───── */
  const saveTask = useCallback((data) => {
    const isNew = !data.id
    const id = data.id || uid()
    const payload = { ...data, updatedAt: new Date().toISOString() }
    delete payload.id
    if (isNew) Object.assign(payload, { createdBy: profile.id, createdAt: new Date().toISOString() })
    run(store.set('tasks', id, payload))
  }, [store, profile, run])

  const deleteTask = useCallback((id) => {
    run(store.remove('tasks', id))
    completions.filter((c) => c.taskId === id).forEach((c) => run(store.remove('completions', c.id)))
  }, [store, completions, run])

  /* ───── pengumuman ───── */
  const saveAnnouncement = useCallback(({ title, body, pinned }) => {
    run(store.set('announcements', uid(), {
      title, body, pinned: !!pinned,
      createdBy: profile.id, author: profile.name, createdAt: new Date().toISOString(),
    }))
  }, [store, profile, run])
  const deleteAnnouncement = useCallback((id) => run(store.remove('announcements', id)), [store, run])
  const togglePin = useCallback((a) => run(store.set('announcements', a.id, { pinned: !a.pinned })), [store, run])

  const annSeenAt = annSeen[profile?.id] || 0
  const markAnnouncementsSeen = useCallback(() => {
    if (!profile) return
    setAnnSeen((cur) => {
      const next = { ...cur, [profile.id]: Date.now() }
      saveJSON('ctr:annSeen', next)
      return next
    })
  }, [profile])

  const unreadAnnouncements = useMemo(
    () => announcements.filter((a) => a.createdBy !== profile?.id && new Date(a.createdAt).getTime() > annSeenAt).length,
    [announcements, profile?.id, annSeenAt]
  )

  /* ───── notifikasi ───── */
  const enableNotifications = useCallback(async () => {
    const res = await requestNotifPermission()
    setPermission(res)
    return res
  }, [])

  const allTasks = useMemo(() => [...tasks, ...celoeTasks], [tasks, celoeTasks])

  const value = {
    theme, store, ready: !!store, mode: store?.mode, online,
    profile, role: profile?.role, login, logout,
    tasks: allTasks, announcements, annLoaded, students, completions,
    celoeCalendarUrl, saveCeloeCalendarUrl, syncCeloeCalendar, celoeSyncing, celoeLastSync, importCeloeTimeline,
    isDone, toggleDone, progressByTask,
    saveTask, deleteTask, saveAnnouncement, deleteAnnouncement, togglePin,
    annSeenAt, markAnnouncementsSeen, unreadAnnouncements,
    reminders, setReminders, permission, enableNotifications,
    toasts, pushToast, dismissToast,
    editor, setEditor, detailTaskId, setDetailTaskId, guideOpen, setGuideOpen,
    resetLocalData: () => store?.mode === 'local' && resetLocal(),
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}