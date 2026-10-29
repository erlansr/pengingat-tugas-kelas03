import { createHash } from 'node:crypto'
import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

function getDb() {
  if (!getApps().length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
    if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON belum dikonfigurasi.')
    initializeApp({ credential: cert(JSON.parse(raw)) })
  }
  return getFirestore()
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Gunakan POST.' })
  }

  const expected = process.env.CELOE_BOT_TOKEN
  const supplied = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!expected || !supplied || supplied.length !== expected.length ||
      !Buffer.from(supplied).equals(Buffer.from(expected))) {
    return res.status(401).json({ error: 'Token bot tidak valid.' })
  }

  try {
    const events = Array.isArray(req.body?.events) ? req.body.events.slice(0, 500) : []
    if (!events.length) return res.status(400).json({ error: 'Tidak ada event Timeline.' })
    const db = getDb()
    const batch = db.batch()
    let count = 0

    for (const event of events) {
      const timestamp = Number(event.timestamp)
      const title = String(event.name || '').trim().slice(0, 200)
      if (!title || !Number.isFinite(timestamp) || timestamp <= 0) continue
      const deadline = new Date(timestamp * 1000)
      if (Number.isNaN(deadline.getTime())) continue
      const sourceKey = String(event.id || `${event.course || 'CeLOE'}-${title}-${timestamp}`)
      const id = 'celoe-timeline-' + createHash('sha256').update(sourceKey).digest('hex').slice(0, 32)
      const ref = db.collection('tasks').doc(id)
      batch.set(ref, {
        id,
        title,
        course: String(event.course || 'CeLOE').slice(0, 160),
        description: 'Tenggat disinkronkan otomatis dari Timeline CeLOE.',
        deadline: deadline.toISOString(),
        priority: 'medium',
        source: 'celoe-timeline-bot',
        sourceEventId: String(event.id || ''),
        sourceUrl: typeof event.url === 'string' && event.url.startsWith('https://lms.telkomuniversity.ac.id/') ? event.url : '',
        createdBy: 'celoe-timeline-bot',
        updatedAt: new Date().toISOString(),
      }, { merge: true })
      count++
    }

    if (!count) return res.status(400).json({ error: 'Tidak ada deadline valid.' })
    await batch.commit()
    return res.status(200).json({ ok: true, count })
  } catch (error) {
    console.error('[celoe-timeline-sync]', error?.message || error)
    return res.status(500).json({ error: 'Gagal menyimpan deadline ke Firestore.' })
  }
}
