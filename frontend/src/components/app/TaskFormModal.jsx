import { useEffect, useState } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { Select, TextArea, TextInput } from '../ui/Field'
import { Api, errorMessage } from '../../lib/api'
import { PRIORITIES, PRIORITY_META } from '../../lib/constants'
import { useToast } from '../ui/Toast'

/** Creates a task (needs projectId or a projects list to choose from) or edits core fields of one. */
export default function TaskFormModal({ open, onClose, projectId, projects, members = [], task, onSaved }) {
  const editing = Boolean(task)
  const blank = { title: '', description: '', priority: 'MEDIUM', assigneeId: '', dueDate: '', projectId: projectId ?? '' }
  const [form, setForm] = useState(blank)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const toast = useToast()

  useEffect(() => {
    if (!open) return
    setError(null)
    setForm(task
      ? { title: task.title, description: task.description ?? '', priority: task.priority, assigneeId: '', dueDate: task.dueDate ?? '', projectId: task.projectId }
      : { ...blank, projectId: projectId ?? projects?.[0]?.id ?? '' })
  }, [open, task, projectId]) // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    if (!form.title.trim()) return setError('Give the task a title.')
    if (!editing && !form.projectId) return setError('Choose a project for this task.')
    setBusy(true)
    try {
      const body = { title: form.title.trim(), description: form.description.trim() || null, priority: form.priority, dueDate: form.dueDate || null }
      const saved = editing
        ? await Api.updateTask(task.id, body)
        : await Api.createTask(form.projectId, { ...body, assigneeId: form.assigneeId ? Number(form.assigneeId) : null })
      toast.success(editing ? 'Task updated' : 'Task created')
      onSaved(saved)
    } catch (err) { setError(errorMessage(err)) } finally { setBusy(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit task' : 'New task'}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        {!editing && projects && !projectId && (
          <Select label="Project" value={form.projectId} onChange={set('projectId')}>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        )}
        <TextInput label="Title" value={form.title} onChange={set('title')} maxLength={180} />
        <TextArea label="Description" rows={3} value={form.description} onChange={set('description')} />
        <div className="grid grid-cols-2 gap-3">
          <Select label="Priority" value={form.priority} onChange={set('priority')}>
            {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_META[p].label}</option>)}
          </Select>
          <TextInput label="Due date" type="date" value={form.dueDate} onChange={set('dueDate')} />
        </div>
        {!editing && (
          <Select label="Assignee" value={form.assigneeId} onChange={set('assigneeId')}>
            <option value="">Unassigned</option>
            {members.map((m) => <option key={m.userId} value={m.userId}>{m.fullName}</option>)}
          </Select>
        )}
        {error && <p role="alert" className="text-sm font-medium text-danger">{error}</p>}
        <div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" loading={busy}>{editing ? 'Save changes' : 'Create task'}</Button></div>
      </form>
    </Modal>
  )
}
