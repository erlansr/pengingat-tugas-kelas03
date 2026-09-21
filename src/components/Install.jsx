import { useState } from 'react'
import { Download, MoreVertical, Plus, Share, SquarePlus, X } from 'lucide-react'
import { useApp } from '../context'
import { useInstall } from '../hooks/useInstall'
import { loadJSON, saveJSON } from '../lib/utils'
import { Button, Modal, Segmented } from './ui'

const DISMISS_KEY = 'ctr:installDismissed'

/** Banner ajakan memasang aplikasi (disembunyikan 7 hari bila ditutup) */
export function InstallBanner() {
  const { setGuideOpen } = useApp()
  const install = useInstall()
  const [hidden, setHidden] = useState(() => Date.now() - loadJSON(DISMISS_KEY, 0) < 7 * 864e5)

  if (install.installed || hidden) return null
  if (!install.canPrompt && install.platform === 'desktop') return null

  const dismiss = () => {
    saveJSON(DISMISS_KEY, Date.now())
    setHidden(true)
  }

  return (
    <div className="mb-4 flex items-center gap-3 rounded-xl border border-accent bg-surface p-3 pl-4">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold leading-tight">Pasang di layar utama</p>
        <p className="text-xs text-muted">Buka lebih cepat dan tetap jalan saat sinyal lemah.</p>
      </div>
      {install.canPrompt ? (
        <Button size="sm" onClick={install.prompt}><Download className="h-4 w-4" />Pasang</Button>
      ) : (
        <Button size="sm" onClick={() => setGuideOpen(true)}>Lihat caranya</Button>
      )}
      <button onClick={dismiss} aria-label="Tutup ajakan" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-sunken">
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

function Step({ n, icon, children }) {
  return (
    <li className="flex gap-3">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent text-[13px] font-extrabold text-accent-ink">{n}</span>
      <p className="flex-1 pt-0.5 text-[15px] leading-snug">
        {children}
        {icon && <span className="ml-1.5 inline-flex h-6 w-6 translate-y-1.5 place-items-center justify-center rounded-md bg-sunken align-baseline text-ink">{icon}</span>}
      </p>
    </li>
  )
}

/** Panduan pemasangan untuk Android & iOS */
export function InstallGuide() {
  const { guideOpen, setGuideOpen } = useApp()
  const install = useInstall()
  const [tab, setTab] = useState(install.platform === 'ios' ? 'ios' : 'android')

  return (
    <Modal open={guideOpen} onClose={() => setGuideOpen(false)} title="Cara memasang aplikasi">
      <Segmented
        value={tab}
        onChange={setTab}
        className="mb-4"
        options={[{ value: 'android', label: 'Android' }, { value: 'ios', label: 'iPhone / iPad' }]}
      />

      {tab === 'android' ? (
        <>
          <ol className="space-y-3.5">
            <Step n={1}>Buka aplikasi ini di <b>Chrome</b>.</Step>
            <Step n={2} icon={<MoreVertical className="h-4 w-4" />}>Ketuk menu titik tiga di pojok kanan atas</Step>
            <Step n={3}>Pilih <b>Instal aplikasi</b> atau <b>Tambahkan ke layar utama</b>.</Step>
            <Step n={4}>Ketuk <b>Instal</b>. Ikon Tugas Kelas muncul di layar utama.</Step>
          </ol>
          {install.canPrompt && (
            <Button className="mt-5 w-full" onClick={install.prompt}><Download className="h-4 w-4" />Pasang sekarang</Button>
          )}
        </>
      ) : (
        <>
          <ol className="space-y-3.5">
            <Step n={1}>Buka aplikasi ini di <b>Safari</b>. Browser lain di iOS tidak bisa memasang.</Step>
            <Step n={2} icon={<Share className="h-4 w-4" />}>Ketuk tombol Bagikan di bilah bawah</Step>
            <Step n={3} icon={<SquarePlus className="h-4 w-4" />}>Gulir, lalu pilih <b>Tambah ke Layar Utama</b></Step>
            <Step n={4}>Ketuk <b>Tambah</b> di pojok kanan atas.</Step>
          </ol>
          <p className="mt-4 rounded-lg bg-sunken p-3 text-sm text-muted">
            Notifikasi pengingat di iPhone/iPad hanya berfungsi setelah aplikasi dipasang ke Layar Utama (iOS 16.4 ke atas). Buka dari ikonnya, lalu izinkan notifikasi di Pengaturan.
          </p>
        </>
      )}
    </Modal>
  )
}
