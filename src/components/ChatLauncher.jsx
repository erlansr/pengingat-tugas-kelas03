import { lazy, Suspense, useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { useApp } from '../context'

// Kode chat baru diunduh saat tombol pertama kali ditekan
const ChatBox = lazy(() => import('./ChatBox'))

export default function ChatLauncher() {
  const { mode, online, profile } = useApp()
  const [open, setOpen] = useState(false)

  // Chat butuh Firebase + koneksi internet
  if (mode !== 'firebase' || !online || !profile) return null

  return (
    <>
      {open && (
        <Suspense fallback={null}>
          <ChatBox name={profile.name} onClose={() => setOpen(false)} />
        </Suspense>
      )}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Buka chat kelas"
          className="fixed bottom-20 right-3 z-40 grid h-12 w-12 place-items-center rounded-full bg-accent text-white shadow-lg md:bottom-6 md:right-6"
        >
          <MessageCircle className="h-5 w-5" />
        </button>
      )}
    </>
  )
}
