import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../context'
import { Button, Field, Modal, Segmented, inputCls } from './ui'
import { endOfDayInput, fromLocalInput, toLocalInput } from '../lib/dates'

const blank = { title: '', course: '', description: '', deadline: '', priority: 'medium' }

export default function TaskForm() {
  const { editor, setEditor, saveTask, tasks } = useApp()
  const editing = editor?.task
  const [form, setForm] = useState(blank)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!editor) return
    setError('')
    if (editor.task) {
      const t = editor.task
      setForm({
        title: t.title, course: t.course || '', description: t.description || '',
        deadline: toLocalInput(t.deadline), priority: t.priority || 'medium',
      })
    } else {
      setForm({ ...blank, deadline: endOfDayInput(editor.defaultDate || Date.now() + 864e5) })
    }
  }, [editor])

  const courses = useMemo(() => [...new Set(tasks.map((t) => t.course).filter(Boolean))].sort(), [tasks])
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const close = () => setEditor(null)

  const submit = (e) => {
    e.preventDefault()
    if (!form.title.trim()) return setError('Judul tugas wajib diisi.')
    if (!form.deadline) return setError('Tenggat wajib diisi.')
    saveTask({
      id: editing?.id,
      title: form.title.trim(),
      course: form.course.trim(),
      description: form.description.trim(),
      deadline: fromLocalInput(form.deadline),
      priority: form.priority,
    })
    close()
  }

  return (
    <Modal
      open={!!editor}
      onClose={close}
      title={editing ? 'Ubah tugas' : 'Tugas baru'}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={close} type="button">Batal</Button>
          <Button type="submit" form="task-form">{editing ? 'Simpan perubahan' : 'Tambah tugas'}</Button>
        </div>
      }
    >
      <form id="task-form" onSubmit={submit} className="space-y-4">
        <Field label="Judul tugas">
          <input className={inputCls} value={form.title} onChange={set('title')} placeholder="Contoh: Laporan praktikum bab 3" autoFocus />
        </Field>
        <Field label="Mata kuliah">
          <input className={inputCls} value={form.course} onChange={set('course')} list="courses" placeholder="Contoh: Basis Data" />
          <datalist id="courses">{courses.map((c) => <option key={c} value={c} />)}</datalist>
        </Field>
        <Field label="Tenggat">
          <input type="datetime-local" className={inputCls} value={form.deadline} onChange={set('deadline')} />
        </Field>
        <Field label="Prioritas">
          <Segmented
            value={form.priority}
            onChange={(v) => setForm((f) => ({ ...f, priority: v }))}
            options={[
              { value: 'low', label: 'Rendah' },
              { value: 'medium', label: 'Sedang' },
              { value: 'high', label: 'Tinggi' },
            ]}
          />
        </Field>
        <Field label="Keterangan" hint="Format pengumpulan, tautan, atau catatan dosen.">
          <textarea className={inputCls + ' min-h-24 resize-y'} value={form.description} onChange={set('description')} />
        </Field>
        {error && <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm font-medium text-danger">{error}</p>}
      </form>
    </Modal>
  )
}
