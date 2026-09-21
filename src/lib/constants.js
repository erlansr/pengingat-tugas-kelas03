export const PRIORITY = {
  high: { label: 'Tinggi', dot: 'bg-danger', text: 'text-danger' },
  medium: { label: 'Sedang', dot: 'bg-warn', text: 'text-warn' },
  low: { label: 'Rendah', dot: 'bg-ok', text: 'text-ok' },
}

export const TONE_TEXT = {
  overdue: 'text-danger',
  urgent: 'text-danger',
  soon: 'text-warn',
  near: 'text-warn',
  ok: 'text-muted',
}

export const LEAD_OPTIONS = [
  { min: 1440, label: '1 hari sebelum' },
  { min: 180, label: '3 jam sebelum' },
  { min: 60, label: '1 jam sebelum' },
]

export const CLASS_NAME = import.meta.env.VITE_CLASS_NAME || 'pristine'
export const KETUA_PIN = import.meta.env.VITE_KETUA_PIN || '1015'
export const PIN_IS_DEFAULT = !import.meta.env.VITE_KETUA_PIN
