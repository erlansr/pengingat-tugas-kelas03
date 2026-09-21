// Ditambahkan ke service worker hasil Workbox (lihat vite.config.js → importScripts)
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    (async () => {
      const wins = await clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const w of wins) {
        if ('focus' in w) return w.focus()
      }
      if (clients.openWindow) return clients.openWindow(self.registration.scope)
    })()
  )
})
