import { Bell, BellOff, Cloud, Database, Download, LogOut, Monitor, Moon, RotateCcw, Smartphone, Sun } from 'lucide-react'
import { useApp } from '../context'
import { useInstall } from '../hooks/useInstall'
import { Button, Segmented, Toggle } from '../components/ui'
import { LEAD_OPTIONS, CLASS_NAME } from '../lib/constants'
import { notifSupported, showSystemNotification } from '../lib/notify'
import { initials } from '../lib/utils'

function Section({ title, children }) {
  return (
    <section className="rounded-xl border border-line bg-surface p-4">
      <h2 className="mb-3 text-lg font-extrabold">{title}</h2>
      {children}
    </section>
  )
}

export default function SettingsView() {
  const {
    profile, role, logout, theme, reminders, setReminders, permission, enableNotifications,
    pushToast, mode, online, setGuideOpen, resetLocalData,
  } = useApp()
  const install = useInstall()

  const toggleReminders = async (on) => {
    if (on && notifSupported() && permission === 'default') await enableNotifications()
    setReminders({ enabled: on })
  }
  const toggleLead = (min) => {
    const has = reminders.leads.includes(min)
    if (has && reminders.leads.length === 1) return // minimal satu
    setReminders({ leads: has ? reminders.leads.filter((l) => l !== min) : [...reminders.leads, min] })
  }
  const test = async () => {
    const ok = await showSystemNotification('Tes pengingat', { body: 'Notifikasi berfungsi. Pengingat tugas akan tampil seperti ini.', tag: 'test' })
    pushToast({ tone: ok ? 'info' : 'warn', title: 'Tes pengingat', body: ok ? 'Notifikasi sistem terkirim.' : 'Notifikasi sistem belum diizinkan, jadi pengingat hanya tampil di dalam aplikasi.' })
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">Pengaturan</h1>

      <section className="flex items-center gap-3.5 rounded-xl border border-line bg-surface p-4">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-accent text-lg font-extrabold text-accent-ink">{initials(profile.name)}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-extrabold leading-tight">{profile.name}</p>
          <p className="text-sm text-muted">{role === 'ketua' ? `Ketua ${CLASS_NAME}` : `NIM ${profile.nim}`}</p>
        </div>
        <Button variant="outline" size="sm" onClick={logout}><LogOut className="h-4 w-4" />Keluar</Button>
      </section>

      <Section title="Tampilan">
        <Segmented
          value={theme.mode}
          onChange={theme.setMode}
          options={[
            { value: 'light', label: 'Folio', icon: <Sun className="h-4 w-4" /> },
            { value: 'dark', label: 'Papan tulis', icon: <Moon className="h-4 w-4" /> },
            { value: 'system', label: 'Ikuti perangkat', icon: <Monitor className="h-4 w-4" /> },
          ]}
        />
      </Section>

      {role === 'mahasiswa' && (
        <Section title="Pengingat tugas">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-semibold">Ingatkan tugas yang belum dicentang</p>
              <p className="text-sm text-muted">Berlaku selama aplikasi terbuka atau berjalan di latar belakang.</p>
            </div>
            <Toggle checked={reminders.enabled} onChange={toggleReminders} label="Aktifkan pengingat" />
          </div>

          {reminders.enabled && (
            <div className="mt-4 space-y-2 border-t border-dashed border-line pt-4">
              <p className="text-[13px] font-semibold">Waktu pengingat</p>
              {LEAD_OPTIONS.map((o) => (
                <label key={o.min} className="flex items-center gap-2.5 text-sm">
                  <input type="checkbox" className="h-4 w-4 accent-[rgb(var(--c-accent))]" checked={reminders.leads.includes(o.min)} onChange={() => toggleLead(o.min)} />
                  {o.label} tenggat
                </label>
              ))}
            </div>
          )}

          <div className="mt-4 rounded-lg bg-sunken p-3 text-sm">
            {permission === 'granted' && (
              <div className="flex items-center gap-2"><Bell className="h-4 w-4 text-ok" /><span className="flex-1">Notifikasi sistem aktif.</span><Button size="sm" variant="outline" onClick={test}>Kirim tes</Button></div>
            )}
            {permission === 'default' && (
              <div className="flex items-center gap-2"><BellOff className="h-4 w-4 text-muted" /><span className="flex-1">Izinkan notifikasi agar pengingat muncul di layar kunci.</span><Button size="sm" onClick={enableNotifications}>Izinkan</Button></div>
            )}
            {permission === 'denied' && (
              <div className="flex items-start gap-2"><BellOff className="mt-0.5 h-4 w-4 text-danger" /><span>Notifikasi diblokir. Ubah lewat pengaturan situs di browser. Sementara itu pengingat tampil di dalam aplikasi.</span></div>
            )}
            {permission === 'unsupported' && (
              <div className="flex items-start gap-2"><BellOff className="mt-0.5 h-4 w-4 text-muted" /><span>Browser ini belum mendukung notifikasi. Di iPhone/iPad (iOS 16.4+), pasang aplikasi ke Layar Utama lebih dulu.</span></div>
            )}
          </div>
        </Section>
      )}

      <Section title="Pasang aplikasi">
        {install.installed ? (
          <p className="flex items-center gap-2 text-sm"><Smartphone className="h-4 w-4 text-ok" />Aplikasi sudah terpasang di perangkat ini.</p>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <p className="min-w-0 flex-1 text-sm text-muted">Buka dari layar utama tanpa bilah alamat, dan tetap bisa dipakai saat sinyal lemah.</p>
            {install.canPrompt && <Button onClick={install.prompt}><Download className="h-4 w-4" />Pasang</Button>}
            <Button variant={install.canPrompt ? 'outline' : 'primary'} onClick={() => setGuideOpen(true)}>Lihat panduan</Button>
          </div>
        )}
      </Section>

      <Section title="Data & sinkronisasi">
        <div className="flex items-start gap-3 text-sm">
          {mode === 'firebase' ? <Cloud className="mt-0.5 h-5 w-5 shrink-0 text-ok" /> : <Database className="mt-0.5 h-5 w-5 shrink-0 text-warn" />}
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{mode === 'firebase' ? 'Firebase: sinkron langsung' : 'Mode lokal: hanya di perangkat ini'}</p>
            <p className="mt-0.5 text-muted">
              {mode === 'firebase'
                ? online ? 'Perubahan dari Ketua Kelas dan mahasiswa lain muncul otomatis.' : 'Sedang offline. Perubahan Anda diantre dan terkirim saat sinyal kembali.'
                : 'Isi variabel VITE_FIREBASE_* pada file .env agar data dipakai bersama seluruh kelas.'}
            </p>
          </div>
        </div>
        {mode === 'local' && (
          <Button className="mt-3" variant="danger" size="sm" onClick={() => window.confirm('Kembalikan semua data ke contoh awal?') && resetLocalData()}>
            <RotateCcw className="h-4 w-4" />Atur ulang data contoh
          </Button>
        )}
      </Section>
    </div>
  )
}
