import { useEffect, useState } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { TextArea, TextInput } from '../ui/Field'
import { Api, errorMessage } from '../../lib/api'
import { useToast } from '../ui/Toast'

export default function WorkspaceFormModal({ open, onClose, onSaved }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const toast = useToast()
  useEffect(() => { if (open) { setName(''); setDescription(''); setError(null) } }, [open])

  async function submit(e) {
    e.preventDefault()
    if (!name.trim()) return setError('Give the workspace a name.')
    setBusy(true)
    try {
      const ws = await Api.createWorkspace({ name: name.trim(), description: description.trim() || null })
      toast.success('Workspace created')
      onSaved(ws)
    } catch (err) { setError(errorMessage(err)) } finally { setBusy(false) }
  }
  return (
    <Modal open={open} onClose={onClose} title="New workspace" description="A workspace holds your team's projects and members. You become its owner.">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <TextInput label="Name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} placeholder="Capstone team" error={error} />
        <TextArea label="Description (optional)" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        <div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" loading={busy}>Create workspace</Button></div>
      </form>
    </Modal>
  )
}
