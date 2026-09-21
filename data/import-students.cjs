import admin from 'firebase-admin'
import { readFileSync } from 'fs'

const serviceAccount = JSON.parse(
  readFileSync(new URL('./todo-kelas-if-03-firebase-adminsdk-fbsvc-85de11bac1.json', import.meta.url))
)

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
})

const db = admin.firestore()

const students = [
  { nim: '1040', name: 'Andi Pratama', pin: '1040' },
  { nim: '1050', name: 'Bunga Lestari', pin: '1050' },
  // Tambahkan sisanya di sini...
]

async function importData() {
  const batch = db.batch()

  students.forEach((s) => {
    if (!s.nim) return

    const id = `mhs-${s.nim.trim()}`
    const ref = db.collection('students').doc(id)
    batch.set(ref, {
      id: id,
      name: s.name.trim(),
      nim: s.nim.trim(),
      joinedAt: new Date().toISOString()
    }, { merge: true })
  })

  await batch.commit()
  console.log('Berhasil mengimpor', students.length, 'mahasiswa ke Firebase!')
}

importData()  