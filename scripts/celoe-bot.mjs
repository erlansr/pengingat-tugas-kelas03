/**
 * CeLOE Timeline bot (interactive browser).
 *
 * Login is performed manually in the visible browser. This script does not
 * ask for or save your CeLOE password, cookies, or session key.
 *
 * Required environment:
 *   CELOE_TIMELINE_URL=https://lms.telkomuniversity.ac.id/calendar/view.php
 *   CELOE_BOT_ENDPOINT=https://YOUR-VERCEL-DOMAIN/api/celoe-timeline-sync
 *   CELOE_BOT_TOKEN=<same secret as Vercel CELOE_BOT_TOKEN>
 *   CELOE_POLL_MINUTES=5
 *
 * Run: npm run celoe:bot
 */
import { chromium } from 'playwright'

const timelineUrl = process.env.CELOE_TIMELINE_URL || 'https://lms.telkomuniversity.ac.id/calendar/view.php'
const endpoint = process.env.CELOE_BOT_ENDPOINT
const token = process.env.CELOE_BOT_TOKEN
const pollMinutes = Math.max(1, Number(process.env.CELOE_POLL_MINUTES || 5))

if (!endpoint || !token) {
  console.error('Isi CELOE_BOT_ENDPOINT dan CELOE_BOT_TOKEN di .env.bot.local terlebih dahulu.')
  process.exit(1)
}

const browser = await chromium.launch({ headless: false })
const context = await browser.newContext()
const page = await context.newPage()
let lastSentSignature = ''
let busy = false

async function publishTimeline(payload) {
  const roots = Array.isArray(payload) ? payload : [payload]
  const events = roots.flatMap((root) => root?.data?.events || root?.events || [])
  const deadlines = events.filter((event) =>
    event && (event.eventtype === 'close' || /\b(closes|deadline|due)\b/i.test(event.name || event.activitystr || '')) &&
    Number.isFinite(Number(event.timestart || event.timesort)) &&
    (event.activityname || event.name)
  )
  if (!deadlines.length) return

  const normalized = deadlines.map((event) => ({
    id: String(event.id || ''),
    name: String(event.activityname || event.name || 'Tugas CeLOE').replace(/\s+(closes|deadline|due)$/i, '').trim(),
    course: String(event.course?.fullname || event.course?.shortname || 'CeLOE'),
    timestamp: Number(event.timestart || event.timesort),
    url: typeof event.url === 'string' && event.url.startsWith('https://lms.telkomuniversity.ac.id/') ? event.url : '',
  }))
  const signature = JSON.stringify(normalized)
  if (signature === lastSentSignature) {
    console.log(new Date().toLocaleTimeString(), '- Timeline tidak berubah.')
    return
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify({ events: normalized }),
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(result.error || `Endpoint gagal (HTTP ${response.status})`)
  lastSentSignature = signature
  console.log(new Date().toLocaleTimeString(), `- ${result.count || normalized.length} deadline dikirim ke aplikasi.`)
}

page.on('response', async (response) => {
  if (!response.url().includes('core_calendar_get_action_events_by_timesort')) return
  if (response.status() < 200 || response.status() >= 300 || busy) return
  busy = true
  try {
    const payload = await response.json()
    await publishTimeline(payload)
  } catch (error) {
    console.error('Gagal membaca/mengirim Timeline:', error.message)
  } finally {
    busy = false
  }
})

console.log('Browser CeLOE dibuka. Login manual jika diminta; jangan kirim password ke siapa pun.')
console.log('Setelah login, buka halaman Timeline/Kalender CeLOE jika belum terbuka.')
await page.goto(timelineUrl, { waitUntil: 'domcontentloaded' })
console.log(`Bot aktif; akan menyegarkan Timeline setiap ${pollMinutes} menit. Tutup jendela untuk menghentikan.`)

while (true) {
  await new Promise((resolve) => setTimeout(resolve, pollMinutes * 60 * 1000))
  if (page.isClosed()) break
  try {
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 })
  } catch (error) {
    console.error('Refresh gagal:', error.message)
  }
}
await browser.close()
