import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth, signInAnonymously } from 'firebase/auth'
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore'

const cfg = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

// 1. Inisialisasi App
export const app = getApps().length ? getApp() : initializeApp(cfg)

// 2. Inisialisasi Auth
export const auth = getAuth(app)

// 3. Inisialisasi Firestore (Dijamin HANYA berjalan 1 kali saat modul di-import)
let db
try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  })
} catch {
  db = getFirestore(app)
}

export { db }

// Helper Auth Warmup
export async function ensureAuth() {
  try {
    if (auth.authStateReady) {
      await auth.authStateReady()
    }
    if (!auth.currentUser) {
      await signInAnonymously(auth)
    }
  } catch (err) {
    console.warn('[Firebase Auth Warmup Warning]', err)
  }
}