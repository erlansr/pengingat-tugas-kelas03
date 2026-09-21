import { useState } from 'react'
import { GraduationCap, ShieldCheck, ArrowRight } from 'lucide-react'
import { useApp } from '../context'
import { Button, Field, Logo, Segmented, inputCls } from './ui'
import { CLASS_NAME, PIN_IS_DEFAULT } from '../lib/constants'

export default function Login() {
  const { login, mode } = useApp()
  const [role, setRole] = useState('mahasiswa')
  const [name, setName] = useState('')
  const [nim, setNim] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      // Fungsi login akan melempar error jika NIM tidak ditemukan di Firestore
      await login({ role, name, nim, pin })
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <div className="relative z-10 mx-auto flex min-h-dvh max-w-3xl flex-col justify-center py-10 pl-9 pr-5 pt-safe pb-safe sm:pl-12">
      <div className="mb-8 flex items-center gap-3">
        <Logo className="h-11 w-11" />
        <p className="font-display text-xl font-extrabold">{CLASS_NAME}</p>
      </div>

      <h1 className="max-w-xl text-4xl font-extrabold leading-[1.08] sm:text-5xl">
        Semua tugas kelas, tercatat di satu halaman.
      </h1>
      <p className="mt-4 max-w-md text-base leading-relaxed text-muted">
        Centang tugas yang sudah selesai, lihat tenggat di kalender, dan baca pengumuman dari Ketua Kelas.
      </p>

      <form onSubmit={submit} className="mt-8 max-w-md space-y-4 rounded-2xl border border-line bg-surface p-5">
        <Segmented
          value={role}
          onChange={(r) => { setRole(r); setError('') }}
          options={[
            { value: 'mahasiswa', label: 'Mahasiswa', icon: <GraduationCap className="h-4 w-4" /> },
            { value: 'ketua', label: 'Ketua Kelas', icon: <ShieldCheck className="h-4 w-4" /> },
          ]}
        />

        {role === 'mahasiswa' ? (
          <Field label="NIM Mahasiswa" hint="Masukkan PIN Anda yang telah terdaftar di kelas.">
            <input 
              className={inputCls} 
              value={nim} 
              onChange={(e) => setNim(e.target.value)} 
              inputMode="numeric" 
              placeholder="Contoh: 2301006" 
              required 
            />
          </Field>
        ) : (
          <>
            <Field label="Nama Ketua Kelas">
              <input 
                className={inputCls} 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                autoComplete="name" 
                placeholder="Contoh: Sari Wulandari" 
                required 
              />
            </Field>

            <Field label="PIN Ketua Kelas" hint={PIN_IS_DEFAULT ? 'Mode demo: PIN-nya 123456.' : undefined}>
              <input 
                className={inputCls} 
                value={pin} 
                onChange={(e) => setPin(e.target.value)} 
                type="password" 
                inputMode="numeric" 
                autoComplete="off" 
                required 
              />
            </Field>
          </>
        )}

        {error && (
          <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm font-medium text-danger">
            {error}
          </p>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy ? 'Memeriksa…' : 'Masuk'}
          {!busy && <ArrowRight className="h-4 w-4" />}
        </Button>
      </form>

      <p className="mt-4 max-w-md text-xs text-muted">
        {mode === 'firebase'
          ? 'Terhubung ke Firebase: login dibatasi khusus NIM yang terdaftar.'
          : 'Mode lokal: data tersimpan di perangkat ini dan berisi contoh tugas.'}
      </p>
    </div>
  )
}
