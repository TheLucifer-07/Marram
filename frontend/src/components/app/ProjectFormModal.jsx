import { useEffect, useState } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { Select, TextArea, TextInput } from '../ui/Field'
import { Api, errorMessage } from '../../lib/api'
import { useToast } from '../ui/Toast'

const today = () => new Date().toISOString().slice(0, 10)

export default function ProjectFormModal({ open, onClose, workspaceId, project, onSaved }) {
  const editing = Boolean(project)
  const [form, setForm] = useState({ name: '', description: '', startDate: today(), dueDate: '', status: 'ACTIVE' })
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const toast = useToast()

  useEffect(() => {
    if (!open) return
    setError(null)
    setForm(project
      ? { name: project.name, description: project.description ?? '', startDate: project.startDate, dueDate: project.dueDate ?? '', status: project.status }
      : { name: '', description: '', startDate: today(), dueDate: '', status: 'ACTIVE' })
  }, [open, project])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    if (!form.name.trim()) return setError('Give the project a name.')
    if (form.dueDate && form.dueDate < form.startDate) return setError('The due date cannot be before the start date.')
    setBusy(true)
    try {
      const body = { name: form.name.trim(), description: form.description.trim() || null, startDate: form.startDate, dueDate: form.dueDate || null }
      const saved = editing ? await Api.updateProject(project.id, { ...body, status: form.status }) : await Api.createProject(workspaceId, body)
      toast.success(editing ? 'Project updated' : 'Project created')
      onSaved(saved)
    } catch (err) { setError(errorMessage(err)) } finally { setBusy(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit project' : 'New project'}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <TextInput label="Name" value={form.name} onChange={set('name')} maxLength={150} />
        <TextArea label="Description" rows={3} value={form.description} onChange={set('description')} />
        <div className="grid grid-cols-2 gap-3">
          <TextInput label="Start date" type="date" value={form.startDate} onChange={set('startDate')} required />
          <TextInput label="Due date" type="date" value={form.dueDate} onChange={set('dueDate')} />
        </div>
        {editing && (
          <Select label="Status" value={form.status} onChange={set('status')}>
            <option value="ACTIVE">Active</option><option value="COMPLETED">Completed</option>
          </Select>
        )}
        {error && <p role="alert" className="text-sm font-medium text-danger">{error}</p>}
        <div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" loading={busy}>{editing ? 'Save changes' : 'Create project'}</Button></div>
      </form>
    </Modal>
  )
}
