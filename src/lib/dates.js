export const DAY_SHORT = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']
export const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

const pad = (n) => String(n).padStart(2, '0')
const validDate = (value) => {
  const d = value instanceof Date ? new Date(value) : new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

export const dayKey = (value) => {
  const x = validDate(value)
  if (!x) return ''
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`
}
export const startOfDay = (value) => {
  const x = validDate(value) || new Date()
  x.setHours(0, 0, 0, 0)
  return x
}
export const isSameDay = (a, b) => {
  const ka = dayKey(a)
  return !!ka && ka === dayKey(b)
}

/** ISO → nilai <input type="datetime-local"> */
export const toLocalInput = (iso) => {
  const d = validDate(iso)
  if (!d) return ''
  return `${dayKey(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
export const fromLocalInput = (s) => {
  const d = validDate(s)
  return d ? d.toISOString() : ''
}
export const endOfDayInput = (date) => `${dayKey(date)}T23:59`

const fmtDeadline = new Intl.DateTimeFormat('id-ID', {
  weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
})
export const formatDeadline = (iso) => {
  const d = validDate(iso)
  return d ? fmtDeadline.format(d) : 'Tanggal tidak valid'
}

const fmtLong = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
export const formatLongDate = (value) => {
  const d = validDate(value)
  return d ? fmtLong.format(d) : 'Tanggal tidak valid'
}

export function humanDuration(ms) {
  if (!Number.isFinite(ms)) return 'waktu tidak diketahui'
  const m = Math.round(ms / 60000)
  if (m < 60) return `${Math.max(m, 1)} menit`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} jam`
  return `${Math.round(h / 24)} hari`
}

/** tone: overdue | urgent (<3 jam) | soon (<24 jam) | near (<72 jam) | ok */
export function relativeDeadline(iso, now = Date.now()) {
  const d = validDate(iso)
  if (!d) return { text: 'Tanggal tidak valid', tone: 'overdue', diff: NaN }
  const diff = d.getTime() - now
  if (diff < 0) return { text: `Terlambat ${humanDuration(-diff)}`, tone: 'overdue', diff }
  const H = 3600e3
  const tone = diff < 3 * H ? 'urgent' : diff < 24 * H ? 'soon' : diff < 72 * H ? 'near' : 'ok'
  return { text: `${humanDuration(diff)} lagi`, tone, diff }
}

export function timeAgo(iso, now = Date.now()) {
  const d = validDate(iso)
  if (!d) return 'waktu tidak diketahui'
  const diff = now - d.getTime()
  if (diff < 60e3) return 'baru saja'
  return `${humanDuration(diff)} lalu`
}

/** Grid 6 minggu × 7 hari, minggu dimulai hari Senin */
export function buildMonthGrid(year, month) {
  const first = new Date(year, month, 1)
  const offset = (first.getDay() + 6) % 7
  return Array.from({ length: 42 }, (_, i) => new Date(year, month, 1 - offset + i))
}
