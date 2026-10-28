import { auth } from './firebase.js'

export async function fetchCeloeCalendar(calendarUrl) {
  const user = auth.currentUser
  if (!user) throw new Error('Sesi Firebase belum siap. Coba buka ulang aplikasi.')
  const token = await user.getIdToken()
  const response = await fetch('/api/celoe-sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify({ calendarUrl }),
    cache: 'no-store',
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(result.error || 'Sinkronisasi kalender gagal.')
  return result
}
