import { createHash } from 'node:crypto'
import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'

function getAdminAuth() {
  if (getApps().length) return getAuth()
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON belum dikonfigurasi di Vercel.')
  let serviceAccount
  try {
    serviceAccount = JSON.parse(raw)
  } catch {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON bukan JSON yang valid.')
  }
  initializeApp({ credential: cert(serviceAccount) })
  return getAuth()
}

function decodeText(value = '') {
  return value.replace(/\\n/g, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\')
}

function parseIcsDate(raw, params = '') {
  if (!raw) return null
  const value = raw.trim()
  const match = value.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?)?(Z)?$/)
  if (!match) return null
  const [, year, month, day, hour = '00', minute = '00', second = '00', utc] = match
  if (!match[4]) {
    // All-day calendar entries are treated as a deadline at 23:59 WIB.
    return new Date(Date.UTC(+year, +month - 1, +day, 16, 59, 0)).toISOString()
  }
  if (utc) return new Date(Date.UTC(+year, +month - 1, +day, +hour, +minute, +second)).toISOString()

  const tz = (params.match(/TZID=([^;:]+)/i)?.[1] || 'Asia/Jakarta').replace(/^"|"$/g, '')
  const offsets = { 'Asia/Jakarta': 7, 'Asia/Pontianak': 7, 'Asia/Makassar': 8, 'Asia/Jayapura': 9 }
  const offset = offsets[tz] ?? 7
  return new Date(Date.UTC(+year, +month - 1, +day, +hour - offset, +minute, +second)).toISOString()
}

function parseCalendar(ics) {
  const unfolded = ics.replace(/\r?\n[ \t]/g, '')
  const blocks = unfolded.split('BEGIN:VEVENT').slice(1).map((part) => part.split('END:VEVENT')[0])
  const events = []

  for (const block of blocks) {
    const props = {}
    for (const line of block.split(/\r?\n/)) {
      const match = line.match(/^([A-Z-]+)(?:;([^:]*))?:(.*)$/i)
      if (!match) continue
      const [, name, params = '', rawValue] = match
      const key = name.toUpperCase()
      if (!props[key]) props[key] = { params, value: decodeText(rawValue.trim()) }
    }

    const title = props.SUMMARY?.value?.trim()
    const uid = props.UID?.value?.trim()
    const start = props.DTSTART
    const end = props.DTEND
    const deadline = parseIcsDate(start?.value || end?.value, start?.params || end?.params || '')
    if (!title || !deadline) continue

    const sourceKey = uid || `${title}| ${deadline}`
    const id = `celoe-${createHash('sha256').update(sourceKey).digest('hex').slice(0, 24)}`
    events.push({
      id,
      sourceId: sourceKey,
      title: title.slice(0, 200),
      description: (props.DESCRIPTION?.value || props.LOCATION?.value || 'Diimpor dari kalender CeLOE.').slice(0, 4000),
      course: (props.CATEGORIES?.value || 'CeLOE').slice(0, 120),
      deadline,
      url: props.URL?.value || '',
    })
  }

  return events
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Gunakan POST.' })
  }

  try {
    const authHeader = req.headers.authorization || ''
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!idToken) return res.status(401).json({ error: 'Sesi aplikasi tidak valid. Muat ulang aplikasi.' })

    const adminAuth = getAdminAuth()
    await adminAuth.verifyIdToken(idToken)

    const calendarUrl = req.body?.calendarUrl
    let parsedUrl
    try {
      parsedUrl = new URL(calendarUrl)
    } catch {
      return res.status(400).json({ error: 'URL kalender tidak valid.' })
    }

    if (
      parsedUrl.protocol !== 'https:' ||
      parsedUrl.hostname !== 'lms.telkomuniversity.ac.id' ||
      parsedUrl.pathname !== '/calendar/export_execute.php' ||
      !parsedUrl.searchParams.has('authtoken') ||
      !parsedUrl.searchParams.has('userid')
    ) {
      return res.status(400).json({ error: 'Masukkan Calendar URL resmi dari CeLOE Telkom University.' })
    }

    const response = await fetch(parsedUrl.toString(), {
      headers: { Accept: 'text/calendar, text/plain;q=0.9, */*;q=0.1' },
      signal: AbortSignal.timeout(12000),
      redirect: 'error',
    })
    if (!response.ok) return res.status(502).json({ error: `CeLOE gagal mengirim kalender (HTTP ${response.status}).` })

    const ics = await response.text()
    if (!ics.includes('BEGIN:VCALENDAR') || ics.length > 2_000_000) {
      return res.status(502).json({ error: 'Respons CeLOE bukan file kalender yang valid.' })
    }

    const events = parseCalendar(ics)
    return res.status(200).json({ events, count: events.length, syncedAt: new Date().toISOString() })
  } catch (error) {
    console.error('[celoe-sync]', error?.message || error)
    if (String(error?.message || '').includes('FIREBASE_SERVICE_ACCOUNT_JSON')) {
      return res.status(503).json({ error: 'Sinkronisasi LMS belum dikonfigurasi di Vercel.' })
    }
    return res.status(500).json({ error: 'Sinkronisasi CeLOE gagal. Coba lagi sebentar.' })
  }
}
