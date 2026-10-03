import { useEffect, useRef, useState } from 'react'
import { Send, X } from 'lucide-react'
import { auth } from '../lib/firebase'
import { CHAT_COOLDOWN_MS, CHAT_MAX_LEN, listenChat, sendChat } from '../lib/chat'
import { cx } from '../lib/utils'

function fmtTime(ts) {
  const d = ts?.toDate?.()
  return d ? d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : ''
}

export default function ChatBox({ name, onClose }) {
  const [msgs, setMsgs] = useState([])
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const lastSent = useRef(0)
  const listRef = useRef(null)
  const myUid = auth.currentUser?.uid

  // Listener hanya hidup selama panel terbuka
  useEffect(() => {
    const unsub = listenChat(setMsgs, () => setError('Chat tidak bisa dimuat.'))
    return () => unsub()
  }, [])

  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [msgs])

  async function submit(e) {
    e.preventDefault()
    if (sending || !text.trim()) return
    if (Date.now() - lastSent.current < CHAT_COOLDOWN_MS) {
      setError('Tunggu sebentar sebelum kirim lagi.')
      return
    }
    setSending(true)
    setError('')
    try {
      await sendChat(name, text)
      lastSent.current = Date.now()
      setText('')
    } catch {
      setError('Gagal mengirim pesan.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-label="Chat kelas"
      className="fixed bottom-20 right-3 z-40 flex h-[min(28rem,70dvh)] w-[min(22rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-xl md:bottom-6 md:right-6"
    >
      <div className="flex items-center justify-between border-b border-line px-3 py-2">
        <p className="font-display text-base font-extrabold">Chat Kelas</p>
        <button onClick={onClose} aria-label="Tutup chat" className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-sunken hover:text-ink">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
        {msgs.length === 0 && <p className="pt-6 text-center text-sm text-muted">Belum ada pesan. Mulai obrolan!</p>}
        {msgs.map((m) => {
          const mine = m.uid && m.uid === myUid
          return (
            <div key={m.id} className={cx('flex flex-col', mine ? 'items-end' : 'items-start')}>
              <span className="mb-0.5 text-[11px] font-bold text-muted">
                {mine ? 'Kamu' : m.name} <span className="font-normal">{fmtTime(m.createdAt)}</span>
              </span>
              <p className={cx('max-w-[85%] whitespace-pre-wrap break-words rounded-lg px-3 py-1.5 text-sm', mine ? 'bg-accent text-white' : 'bg-sunken text-ink')}>
                {m.text}
              </p>
            </div>
          )
        })}
      </div>

      {error && <p className="px-3 pb-1 text-xs font-semibold text-danger">{error}</p>}
      <form onSubmit={submit} className="flex gap-2 border-t border-line p-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={CHAT_MAX_LEN}
          placeholder="Tulis pesan…"
          className="min-w-0 flex-1 rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={sending || !text.trim()}
          aria-label="Kirim"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-accent text-white disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  )
}
