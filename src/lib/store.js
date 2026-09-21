/**
 * Lapisan data dengan dua adapter yang antarmukanya sama:
 *   • Firebase (Firestore realtime)  → bila VITE_FIREBASE_* diisi
 *   • Lokal (localStorage)           → cadangan / mode demo, sinkron antar-tab
 *
 * Koleksi: tasks, announcements, students, completions
 * completions: id = `${studentId}_${taskId}` → { studentId, taskId, doneAt }
 */

const PREFIX = 'ctr:data:'
const COLLECTIONS = ['tasks', 'announcements', 'students', 'completions']
const listeners = new Map()

export const isFirebaseConfigured = Boolean(
  import.meta.env.VITE_FIREBASE_API_KEY &&
  import.meta.env.VITE_FIREBASE_PROJECT_ID &&
  import.meta.env.VITE_FIREBASE_APP_ID
)

/* ───────────── Adapter lokal ───────────── */

const read = (col) => {
  try {
    return JSON.parse(localStorage.getItem(PREFIX + col) || '{}')
  } catch {
    return {}
  }
}
const emit = (col) => listeners.get(col)?.forEach((fn) => fn())
const write = (col, data) => {
  localStorage.setItem(PREFIX + col, JSON.stringify(data))
  emit(col)
}

if (typeof window !== 'undefined') {
  // sinkron antar-tab
  window.addEventListener('storage', (e) => {
    if (e.key && e.key.startsWith(PREFIX)) emit(e.key.slice(PREFIX.length))
  })
}

export function createLocalStore() {
  return {
    mode: 'local',
    subscribe(col, cb, { where } = {}) {
      const run = () => {
        let rows = Object.values(read(col))
        if (where) rows = rows.filter((d) => d[where[0]] === where[2])
        cb(rows)
      }
      if (!listeners.has(col)) listeners.set(col, new Set())
      listeners.get(col).add(run)
      run()
      return () => listeners.get(col)?.delete(run)
    },
    async get(col, id) {
      const all = read(col)
      return all[id] || null
    },
    async set(col, id, data) {
      const all = read(col)
      all[id] = { ...all[id], ...data, id }
      write(col, all)
    },
    async remove(col, id) {
      const all = read(col)
      delete all[id]
      write(col, all)
    },
  }
}

/* ───────────── Data Kosong (Mode Lokal) ───────────── */

export function seedLocal() {
  // Hanya tandai seeded agar tidak looping, tanpa memasukkan data demo apapun.
  if (localStorage.getItem('ctr:seeded')) return
  localStorage.setItem('ctr:seeded', '1')
}

export function resetLocal() {
  COLLECTIONS.forEach((c) => localStorage.removeItem(PREFIX + c))
  localStorage.removeItem('ctr:seeded')
  localStorage.removeItem('ctr:notified')
  seedLocal()
  COLLECTIONS.forEach(emit)
}

import { db, ensureAuth } from './firebase'
import { collection, query, where as fsWhere, onSnapshot, getDoc, doc, setDoc, deleteDoc } from 'firebase/firestore'

/* ───────────── Adapter Firebase ───────────── */

let bootPromise = null

export async function createFirebaseStore() {
  if (!bootPromise) {
    bootPromise = (async () => {
      // Pastikan Auth siap
      await ensureAuth()

      return {
        mode: 'firebase',
        subscribe(col, cb, { where, onError } = {}) {
          let q = collection(db, col)
          if (where) q = query(q, fsWhere(where[0], where[1], where[2]))
          return onSnapshot(
            q,
            (snap) => cb(snap.docs.map((d) => ({ ...d.data(), id: d.id }))),
            (err) => {
              console.error(`[Firestore Error - ${col}]`, err)
              onError?.(err)
            }
          )
        },
        async get(col, id) {
          try {
            const snap = await getDoc(doc(db, col, id))
            return snap.exists() ? { ...snap.data(), id: snap.id } : null
          } catch (e) {
            console.error(`[Firestore Get Error - ${col}/${id}]`, e)
            return null
          }
        },
        set: (col, id, data) => setDoc(doc(db, col, id), { ...data, id }, { merge: true }),
        remove: (col, id) => deleteDoc(doc(db, col, id)),
      }
    })()
  }

  const timeout = new Promise((_, rej) =>
    setTimeout(() => rej(new Error('Koneksi ke Firebase timeout')), 15000)
  )

  return Promise.race([bootPromise, timeout])
}
