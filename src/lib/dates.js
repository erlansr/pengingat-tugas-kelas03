export const DAY_SHORT = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']
export const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

const pad = (n) => String(n).padStart(2, '0')

export const dayKey = (d) => {
  const x = new Date(d)
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`
}
export const startOfDay = (d) => {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}
export const isSameDay = (a, b) => dayKey(a) === dayKey(b)

/** ISO → nilai <input type="datetime-local"> */
export const toLocalInput = (iso) => {
  const d = new Date(iso)
  return `${dayKey(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
export const fromLocalInput = (s) => new Date(s).toISOString()
export const endOfDayInput = (date) => `${dayKey(date)}T23:59`

const fmtDeadline = new Intl.DateTimeFormat('id-ID', {
  weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
})
export const formatDeadline = (iso) => fmtDeadline.format(new Date(iso))

const fmtLong = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
export const formatLongDate = (d) => fmtLong.format(new Date(d))

export function humanDuration(ms) {
  const m = Math.round(ms / 60000)
  if (m < 60) return `${Math.max(m, 1)} menit`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} jam`
  return `${Math.round(h / 24)} hari`
}

/** tone: overdue | urgent (<3 jam) | soon (<24 jam) | near (<72 jam) | ok */
export function relativeDeadline(iso, now = Date.now()) {
  const diff = new Date(iso).getTime() - now
  if (diff < 0) return { text: `Terlambat ${humanDuration(-diff)}`, tone: 'overdue', diff }
  const H = 3600e3
  const tone = diff < 3 * H ? 'urgent' : diff < 24 * H ? 'soon' : diff < 72 * H ? 'near' : 'ok'
  return { text: `${humanDuration(diff)} lagi`, tone, diff }
}

export function timeAgo(iso, now = Date.now()) {
  const diff = now - new Date(iso).getTime()
  if (diff < 60e3) return 'baru saja'
  return `${humanDuration(diff)} lalu`
}

/** Grid 6 minggu × 7 hari, minggu dimulai hari Senin */
export function buildMonthGrid(year, month) {
  const first = new Date(year, month, 1)
  const offset = (first.getDay() + 6) % 7
  return Array.from({ length: 42 }, (_, i) => new Date(year, month, 1 - offset + i))
}
