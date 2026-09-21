import { useEffect, useReducer } from 'react'

// Simpan event sedini mungkin: browser bisa memicunya sebelum komponen tampil.
let deferred = null
const subs = new Set()
const emit = () => subs.forEach((f) => f())

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e
    emit()
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    emit()
  })
}

export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true

export function detectPlatform() {
  const ua = navigator.userAgent
  const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  if (ios) return 'ios'
  if (/Android/i.test(ua)) return 'android'
  return 'desktop'
}

export function useInstall() {
  const [, force] = useReducer((x) => x + 1, 0)
  useEffect(() => {
    subs.add(force)
    return () => subs.delete(force)
  }, [])

  return {
    canPrompt: !!deferred,
    installed: isStandalone(),
    platform: detectPlatform(),
    async prompt() {
      if (!deferred) return null
      deferred.prompt()
      const { outcome } = await deferred.userChoice
      deferred = null
      emit()
      return outcome
    },
  }
}
