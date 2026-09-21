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

/* ───────────── Data contoh (mode lokal) ───────────── */

export function seedLocal() {
  if (localStorage.getItem('ctr:seeded')) return
  const now = Date.now()
  const H = 3600e3
  const inMs = (ms) => new Date(now + ms).toISOString()
  const eod = (days) => {
    const d = new Date()
    d.setDate(d.getDate() + days)
    d.setHours(23, 59, 0, 0)
    return d.toISOString()
  }

  const tasks = [
    { id: 't1', title: 'Kuis daring Struktur Data (bab 5–6)', course: 'Struktur Data', priority: 'high', deadline: inMs(2.5 * H), description: 'Dikerjakan lewat e-learning kampus. Waktu pengerjaan 30 menit setelah dibuka.' },
    { id: 't2', title: 'Laporan praktikum normalisasi tabel', course: 'Basis Data', priority: 'high', deadline: eod(1), description: 'Format PDF, maksimal 8 halaman. Kumpulkan ke folder Drive kelas dengan nama NIM_Nama.' },
    { id: 't3', title: 'Makalah kode etik profesi TI', course: 'Etika Profesi', priority: 'medium', deadline: eod(3), description: 'Minimal 5 referensi jurnal. Kutipan memakai gaya APA.' },
    { id: 't4', title: 'Slide presentasi kelompok: topologi jaringan', course: 'Jaringan Komputer', priority: 'high', deadline: eod(6), description: 'Presentasi 10 menit per kelompok. Kirim slide sehari sebelum jadwal tampil.' },
    { id: 't5', title: 'Latihan soal limit dan turunan', course: 'Kalkulus', priority: 'low', deadline: eod(10), description: 'Kerjakan soal nomor 1–20 di buku paket.' },
    { id: 't6', title: 'Revisi proposal PKM', course: 'Kewirausahaan', priority: 'medium', deadline: eod(-1), description: 'Perbaiki bagian anggaran sesuai catatan dosen pembimbing.' },
  ].map((t) => ({ ...t, createdBy: 'ketua-demo', createdAt: inMs(-72 * H) }))

  const announcements = [
    { id: 'a1', title: 'Jadwal UTS sudah keluar', body: 'UTS dimulai Senin depan. Jadwal lengkap ada di papan pengumuman jurusan. Cek ruang ujian masing-masing.', pinned: true, createdAt: inMs(-20 * H) },
    { id: 'a2', title: 'Kuliah Jaringan Komputer dipindah', body: 'Kuliah Jaringan Komputer hari Kamis dipindah ke Rabu pukul 13.00 di Lab 2.', pinned: false, createdAt: inMs(-4 * H) },
  ].map((a) => ({ ...a, createdBy: 'ketua-demo', author: 'Ketua Kelas' }))

  const names = [['Andi Pratama', '2301001'], ['Bunga Lestari', '2301002'], ['Citra Ayu', '2301003'], ['Dimas Saputra', '2301004'], ['Eka Wulandari', '2301005']]
  const students = names.map(([name, nim]) => ({ id: `mhs-${nim}`, name, nim, joinedAt: inMs(-96 * H) }))

  const done = { t1: ['2301001', '2301003'], t2: ['2301002'], t5: ['2301001', '2301002', '2301004'], t6: ['2301001', '2301002', '2301003', '2301005'] }
  const completions = {}
  Object.entries(done).forEach(([tid, nims]) =>
    nims.forEach((nim) => {
      const id = `mhs-${nim}_${tid}`
      completions[id] = { id, studentId: `mhs-${nim}`, taskId: tid, doneAt: inMs(-2 * H) }
    })
  )

  const toMap = (arr) => Object.fromEntries(arr.map((x) => [x.id, x]))
  localStorage.setItem(PREFIX + 'tasks', JSON.stringify(toMap(tasks)))
  localStorage.setItem(PREFIX + 'announcements', JSON.stringify(toMap(announcements)))
  localStorage.setItem(PREFIX + 'students', JSON.stringify(toMap(students)))
  localStorage.setItem(PREFIX + 'completions', JSON.stringify(completions))
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