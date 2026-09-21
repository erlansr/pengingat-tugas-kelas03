import { useEffect, useState } from 'react'
import { CalendarDays, ClipboardCheck, Cloud, CloudOff, Database, Megaphone, Moon, Settings, Sun } from 'lucide-react'
import { AppProvider, useApp } from './context'
import { useReminders } from './hooks/useReminders'
import { CLASS_NAME } from './lib/constants'
import { cx } from './lib/utils'
import { showSystemNotification } from './lib/notify'
import { Logo } from './components/ui'
import Login from './components/Login'
import Toasts from './components/Toasts'
import TaskForm from './components/TaskForm'
import TaskProgress from './components/TaskProgress'
import { InstallBanner, InstallGuide } from './components/Install'
import TasksView from './views/TasksView'
import CalendarView from './views/CalendarView'
import AnnouncementsView from './views/AnnouncementsView'
import SettingsView from './views/SettingsView'

const TABS = [
  { id: 'tasks', label: 'Tugas', icon: ClipboardCheck, View: TasksView },
  { id: 'calendar', label: 'Kalender', icon: CalendarDays, View: CalendarView },
  { id: 'announcements', label: 'Pengumuman', icon: Megaphone, View: AnnouncementsView },
  { id: 'settings', label: 'Pengaturan', icon: Settings, View: SettingsView },
]

function StatusPill() {
  const { mode, online } = useApp()
  const state = !online ? 'offline' : mode === 'firebase' ? 'live' : 'local'
  const map = {
    offline: { icon: CloudOff, label: 'Offline', cls: 'bg-warn/15 text-warn' },
    live: { icon: Cloud, label: 'Sinkron', cls: 'bg-ok/15 text-ok' },
    local: { icon: Database, label: 'Lokal', cls: 'bg-sunken text-muted' },
  }[state]
  const Icon = map.icon
  return (
    <span className={cx('inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-bold', map.cls)} title={state === 'local' ? 'Data tersimpan di perangkat ini' : undefined}>
      <Icon className="h-3.5 w-3.5" />
      <span className="hidden min-[380px]:inline">{map.label}</span>
    </span>
  )
}

function Shell() {
  const { ready, profile, role, theme, unreadAnnouncements, store } = useApp()
  const [tab, setTab] = useState('tasks')
  useEffect(() => setTab('tasks'), [profile?.id])
  useReminders()

  // Listener Notifikasi Realtime dari Firebase
  useEffect(() => {
    if (!store || store.mode !== 'firebase') return

    const unsubscribe = store.subscribe('reminders', (reminders) => {
      if (!reminders || reminders.length === 0) return

      const latest = reminders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0]
      const lastNotifiedId = localStorage.getItem('ctr:last_rem_id')

      if (latest && latest.id !== lastNotifiedId) {
        localStorage.setItem('ctr:last_rem_id', latest.id)
        showSystemNotification(latest.title, {
          body: latest.body,
          tag: latest.id,
          data: { url: '/' }
        })
      }
    })

    return () => unsubscribe?.()
  }, [store])

  if (!ready) {
    return (
      <div className="relative z-10 grid min-h-dvh place-items-center">
        <div className="flex flex-col items-center gap-3">
          <Logo className="h-14 w-14 animate-pulse" />
          <p className="text-sm font-semibold text-muted">Menyiapkan halaman…</p>
        </div>
      </div>
    )
  }
  if (!profile) return <><Login /><Toasts /></>

  const Active = TABS.find((t) => t.id === tab).View
  const badge = (id) => (id === 'announcements' && unreadAnnouncements > 0 ? unreadAnnouncements : 0)

  return (
    <div className="relative z-10 min-h-dvh">
      <header className="pt-safe sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 pl-9 pr-4 sm:pl-12">
          <Logo className="h-8 w-8 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-lg font-extrabold leading-none">{CLASS_NAME}</p>
            <p className="mt-0.5 truncate text-xs text-muted">{role === 'ketua' ? 'Ketua Kelas' : 'Mahasiswa'}: {profile.name}</p>
          </div>
          <StatusPill />
          <button
            onClick={() => theme.setMode(theme.dark ? 'light' : 'dark')}
            aria-label={theme.dark ? 'Ganti ke tema folio (terang)' : 'Ganti ke tema papan tulis (gelap)'}
            className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-sunken hover:text-ink"
          >
            {theme.dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
        </div>

        {/* navigasi desktop */}
        <nav className="mx-auto hidden max-w-3xl gap-1 pl-9 pr-4 sm:pl-12 md:flex" aria-label="Menu utama">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              aria-current={tab === id ? 'page' : undefined}
              className={cx(
                '-mb-px flex items-center gap-2 border-b-2 px-3.5 py-2.5 text-sm font-bold transition',
                tab === id ? 'border-accent text-ink' : 'border-transparent text-muted hover:text-ink'
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
              {badge(id) > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-danger px-1 text-[11px] font-extrabold text-white">{badge(id)}</span>}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-3xl pb-28 pl-9 pr-4 pt-5 sm:pl-12 md:pb-12">
        <InstallBanner />
        <Active key={tab} />
      </main>

      {/* navigasi mobile */}
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface md:hidden" aria-label="Menu utama">
        <ul className="mx-auto grid max-w-3xl grid-cols-4">
          {TABS.map(({ id, label, icon: Icon }) => (
            <li key={id}>
              <button
                onClick={() => setTab(id)}
                aria-current={tab === id ? 'page' : undefined}
                className={cx('relative flex w-full flex-col items-center gap-0.5 py-2.5 text-[11px] font-bold transition', tab === id ? 'text-accent' : 'text-muted')}
              >
                <span className={cx('absolute inset-x-6 top-0 h-0.5 rounded-b bg-accent transition-opacity', tab === id ? 'opacity-100' : 'opacity-0')} />
                <span className="relative">
                  <Icon className="h-5 w-5" />
                  {badge(id) > 0 && <span className="absolute -right-2 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] font-extrabold text-white">{badge(id)}</span>}
                </span>
                {label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <TaskForm />
      <TaskProgress />
      <InstallGuide />
      <Toasts />
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  )
}
