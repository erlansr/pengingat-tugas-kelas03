import { addDoc, collection, limit, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore'
import { auth, db, ensureAuth } from './firebase'

export const CHAT_MAX_LEN = 300
export const CHAT_COOLDOWN_MS = 1500

const chatRef = () => collection(db, 'chat')

// Dengarkan 50 pesan terakhir. Panggil fungsi yang dikembalikan untuk berhenti.
export function listenChat(onData, onError) {
  const q = query(chatRef(), orderBy('createdAt', 'desc'), limit(50))
  return onSnapshot(
    q,
    (snap) => {
      const msgs = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .reverse()
      onData(msgs)
    },
    onError
  )
}

export async function sendChat(name, text) {
  const clean = text.trim().slice(0, CHAT_MAX_LEN)
  if (!clean) return
  await ensureAuth()
  return addDoc(chatRef(), {
    name: String(name || 'Anonim').slice(0, 60),
    text: clean,
    uid: auth.currentUser?.uid || '',
    createdAt: serverTimestamp(),
  })
}
