const icon = `${import.meta.env.BASE_URL}icons/icon-192.png`

export const notifSupported = () => typeof window !== 'undefined' && 'Notification' in window
export const readNotifPermission = () => (notifSupported() ? Notification.permission : 'unsupported')

export async function requestNotifPermission() {
  if (!notifSupported()) return 'unsupported'
  try {
    return await Notification.requestPermission()
  } catch {
    return Notification.permission
  }
}

/** Notifikasi sistem via service worker (bisa diklik saat app di latar belakang). */
export async function showSystemNotification(title, options = {}) {
  if (!notifSupported() || Notification.permission !== 'granted') return false
  const opts = { icon, badge: icon, ...options }
  try {
    const reg = await navigator.serviceWorker?.getRegistration()
    if (reg?.showNotification) {
      await reg.showNotification(title, opts)
      return true
    }
  } catch {
    /* jatuh ke Notification biasa */
  }
  try {
    new Notification(title, opts)
    return true
  } catch {
    return false
  }
}
