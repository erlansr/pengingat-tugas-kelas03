# Pengingat Tugas Kelas (PWA)

Aplikasi web progresif untuk mengelola tugas kelas. Ada dua peran: **Mahasiswa** (daftar centang pribadi) dan **Ketua Kelas** (kelola tugas, pengumuman, dan pantau progres).

Dibuat dengan React 18, Vite, Tailwind CSS 3, Firebase (Firestore), dan `vite-plugin-pwa`.

## Fitur

| Fitur | Keterangan |
|---|---|
| Dua peran | Mahasiswa masuk dengan nama + NIM. Ketua Kelas masuk dengan nama + PIN. |
| Checklist pribadi | Centang tiap mahasiswa disimpan per NIM, jadi sama di semua perangkat. |
| Progres kelas | Ketua melihat siapa yang sudah/belum mengumpulkan dan bisa menyalin daftar yang belum untuk dikirim ke grup WhatsApp. |
| Sinkron realtime | Firestore `onSnapshot` dengan cache offline. Tanpa konfigurasi Firebase, aplikasi otomatis memakai penyimpanan lokal (sinkron antar-tab). |
| Kalender | Tampilan bulanan (minggu mulai Senin) dengan titik penanda tenggat dan daftar tugas per hari. |
| Pengumuman | Sematkan, penanda "Baru", lencana jumlah belum dibaca. |
| Pengingat otomatis | Web Notification API: H-1 hari, 3 jam, dan 1 jam sebelum tenggat untuk tugas yang belum dicentang, plus notifikasi pengumuman baru. |
| PWA | Manifest, service worker (precache), ikon maskable, banner pasang untuk Android/desktop, dan panduan langkah demi langkah untuk Android dan iOS. |
| Tema | Terang ("folio bergaris"), gelap ("papan tulis"), atau ikuti perangkat. |

## Mulai cepat

```bash
npm install
cp .env.example .env     # opsional untuk mode lokal
npm run dev
```

Tanpa isi Firebase, aplikasi berjalan di **mode lokal** dengan data contoh. Coba masuk sebagai Ketua Kelas dengan PIN `123456` (bila `VITE_KETUA_PIN` kosong).

Build produksi: `npm run build`, lalu `npm run preview`. Service worker hanya aktif pada build produksi.

## Menyambungkan Firebase

1. Buka [console.firebase.google.com](https://console.firebase.google.com) dan buat proyek.
2. **Build → Authentication → Sign-in method**: aktifkan **Anonymous**.
3. **Build → Firestore Database**: buat database (mode produksi).
4. Tempel isi `firestore.rules` ke tab **Rules**, lalu **Publish** (atau `firebase deploy --only firestore:rules`).
5. **Project settings → Your apps → Web app**: salin konfigurasi ke `.env`:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_KETUA_PIN=pin-rahasia-kelas
```

6. Jalankan ulang `npm run dev` (atau build ulang). Pill di header berubah dari **Lokal** menjadi **Sinkron**.

Bila Firebase tidak bisa dihubungi atau aturan Firestore menolak akses, aplikasi menampilkan pemberitahuan dan otomatis beralih ke data lokal, sehingga tidak pernah layar kosong.

### Model data

```
tasks/{id}          title, course, description, deadline (ISO), priority (low|medium|high),
                    createdBy, createdAt, updatedAt
announcements/{id}  title, body, pinned, author, createdBy, createdAt
students/{id}       name, nim, joinedAt              (id = "mhs-<nim>")
completions/{id}    studentId, taskId, doneAt        (id = "<studentId>_<taskId>")
```

Checklist disimpan sebagai dokumen `completions` tersendiri, bukan array di dalam tugas. Dengan begitu dua mahasiswa yang mencentang bersamaan tidak saling menimpa.

## Cara kerja pengingat

Pemeriksaan berjalan tiap 30 detik dan saat aplikasi kembali terlihat. Jika beberapa ambang terlewat sekaligus (misalnya aplikasi baru dibuka 2 jam sebelum tenggat), hanya satu notifikasi yang dikirim, bukan tiga. Catatan notifikasi yang sudah terkirim disimpan per mahasiswa dan per tenggat, jadi mengubah tenggat akan memicu pengingat baru.

**Batasan yang perlu diketahui:**

- Web Notification API hanya menyala saat aplikasi terbuka atau proses browser masih berjalan di latar belakang. Untuk notifikasi ketika aplikasi benar-benar tertutup, dibutuhkan Web Push (Firebase Cloud Messaging) dan server/Cloud Function terjadwal. Itu pengembangan lanjutan yang tidak termasuk di sini.
- **iOS**: notifikasi web hanya tersedia setelah aplikasi dipasang ke Layar Utama, pada iOS 16.4 ke atas. Panduan di dalam aplikasi menjelaskannya.
- Jika izin notifikasi ditolak, pengingat tetap tampil sebagai pemberitahuan di dalam aplikasi.

## Memperketat keamanan

PIN Ketua Kelas hanya menyembunyikan tombol di antarmuka. Karena ada di sisi klien, orang yang paham teknis bisa menulis ke Firestore langsung. Cukup untuk kelas yang saling percaya, tapi bukan untuk data sensitif. Untuk penguatan:

1. Buat akun Ketua lewat Firebase Auth (email/Google) alih-alih PIN.
2. Beri custom claim `ketua: true` lewat Admin SDK: `getAuth().setCustomUserClaims(uid, { ketua: true })`.
3. Di `firestore.rules`, aktifkan fungsi `isKetua()` dan ganti aturan tulis `tasks` dan `announcements` dengan `allow write: if isKetua();`.

## Deploy

Hasil `dist/` adalah situs statis. Firebase Hosting, Netlify, Vercel, atau Cloudflare Pages semuanya bisa. PWA butuh **HTTPS** (localhost dikecualikan).

Untuk subfolder (misalnya GitHub Pages): `VITE_BASE=/nama-repo/ npm run build`.

## Struktur proyek

```
src/
  context.jsx          state global: auth, langganan data, checklist, tema, toast
  lib/store.js         adapter Firestore + adapter lokal (antarmuka sama) + data contoh
  lib/dates.js         format tanggal Indonesia, grid kalender, tenggat relatif
  lib/notify.js        pembungkus Notification API / service worker
  hooks/useReminders   logika pengingat & notifikasi pengumuman
  hooks/useInstall     event beforeinstallprompt + deteksi platform
  views/               Tugas, Kalender, Pengumuman, Pengaturan
  components/          TaskCard, TaskForm, TaskProgress, Install, Login, Toasts, ui
public/
  sw-extra.js          handler klik notifikasi (digabung ke service worker Workbox)
  icons/               ikon PWA (any + maskable + apple-touch)
```

## Kustomisasi cepat

- Nama kelas: `VITE_CLASS_NAME` di `.env`.
- Warna: token CSS di `src/index.css` (`:root` untuk terang, `.dark` untuk gelap).
- Waktu pengingat: `LEAD_OPTIONS` di `src/lib/constants.js`.
