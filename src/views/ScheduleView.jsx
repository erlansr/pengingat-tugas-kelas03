import { useEffect, useState } from 'react'
import { Clock, MapPin, User, Calendar, RefreshCw, Filter } from 'lucide-react'

const DAYS = [
  { label: 'Semua Hari', value: 'semua' },
  { label: 'Senin', value: 'Senin' },
  { label: 'Selasa', value: 'Selasa' },
  { label: 'Rabu', value: 'Rabu' },
  { label: 'Kamis', value: 'Kamis' },
  { label: 'Jumat', value: 'Jumat' },
  { label: 'Sabtu', value: 'Sabtu' },
]

export default function ScheduleView() {
  const [schedules, setSchedules] = useState([])
  const [classList, setClassList] = useState([]) // Untuk menyimpan daftar pilihan kelas
  const [selectedDay, setSelectedDay] = useState('semua')
  const [selectedClass, setSelectedClass] = useState('semua')
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Fetch data dari API berdasarkan filter
  const fetchSchedule = async () => {
    setLoading(true)
    setError(null)
    try {
      // Menyusun parameter query
      const params = new URLSearchParams()
      if (selectedDay !== 'semua') params.append('hari', selectedDay)
      if (selectedClass !== 'semua') params.append('kelas', selectedClass)

      const url = `https://jadwalkampusku.my.id/api/jadwal.php?${params.toString()}`
      const res = await fetch(url)
      const json = await res.json()

      if (json.status === 'success' && Array.isArray(json.data)) {
        setSchedules(json.data)

        // Otomatis kumpulkan daftar opsi kelas yang unik jika belum diset
        if (classList.length === 0) {
          const uniqueClasses = [...new Set(json.data.map((item) => item.kelas))].filter(Boolean)
          setClassList(uniqueClasses)
        }
      } else {
        setError('Gagal memuat jadwal.')
      }
    } catch (err) {
      console.error(err)
      setError('Gagal terhubung ke server API.')
    } finally {
      setLoading(false)
    }
  }

  // Panggil ulang setiap kali pilihan Hari atau Kelas berubah
  useEffect(() => {
    fetchSchedule()
  }, [selectedDay, selectedClass])

  const formatTime = (timeStr) => timeStr?.substring(0, 5) || ''

  return (
    <div className="space-y-4">
      {/* Header & Tombol Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-black">Jadwal Kuliah</h2>
          <p className="text-xs text-muted">Integrasi API Jadwal Kampus</p>
        </div>
        <button
          onClick={fetchSchedule}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg bg-sunken px-3 py-1.5 text-xs font-bold text-ink hover:bg-line transition disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Area Pilihan Filter (Hari & Kelas) */}
      <div className="grid gap-2 sm:grid-cols-2">
        {/* Dropdown Filter Kelas */}
        <div className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2">
          <Filter className="h-4 w-4 text-accent shrink-0" />
          <div className="flex-1">
            <label className="block text-[10px] font-bold text-muted uppercase">Pilih Kelas</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full bg-transparent text-xs font-bold text-ink outline-none"
            >
              <option value="semua">Semua Kelas</option>
              {classList.map((cls) => (
                <option key={cls} value={cls}>
                  {cls}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Dropdown Filter Hari */}
        <div className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2">
          <Calendar className="h-4 w-4 text-accent shrink-0" />
          <div className="flex-1">
            <label className="block text-[10px] font-bold text-muted uppercase">Pilih Hari</label>
            <select
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
              className="w-full bg-transparent text-xs font-bold text-ink outline-none"
            >
              {DAYS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="grid place-items-center py-12 text-muted">
          <RefreshCw className="h-6 w-6 animate-spin mb-2" />
          <p className="text-xs font-semibold">Mengambil jadwal...</p>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="rounded-xl border border-danger/20 bg-danger/10 p-4 text-center text-sm font-semibold text-danger">
          {error}
        </div>
      )}

      {/* List Kosong */}
      {!loading && !error && schedules.length === 0 && (
        <div className="rounded-xl border border-line bg-paper p-8 text-center text-muted">
          <Calendar className="mx-auto h-8 w-8 mb-2 opacity-40" />
          <p className="text-sm font-bold">Tidak ada jadwal ditemukan.</p>
        </div>
      )}

      {/* Data Card Jadwal */}
      {!loading && !error && schedules.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {schedules.map((item) => (
            <div
              key={item.id}
              className="flex flex-col justify-between rounded-xl border border-line bg-paper p-4 shadow-sm transition hover:border-accent/40"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="rounded-md bg-accent/10 px-2 py-0.5 text-[11px] font-extrabold text-accent">
                    {item.hari}
                  </span>
                  <span className="text-[11px] font-bold text-muted bg-sunken px-2 py-0.5 rounded">
                    {item.kelas}
                  </span>
                </div>
                <h3 className="font-display font-bold text-base text-ink leading-snug">
                  {item.mata_kuliah}
                </h3>
              </div>

              <div className="mt-4 space-y-1.5 border-t border-line/60 pt-3 text-xs text-muted">
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-accent shrink-0" />
                  <span className="font-semibold text-ink">
                    {formatTime(item.jam_mulai)} - {formatTime(item.jam_selesai)} WIB
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-accent shrink-0" />
                  <span>Ruang: <strong className="text-ink">{item.ruangan}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="h-3.5 w-3.5 text-accent shrink-0" />
                  <span className="truncate">{item.dosen}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
