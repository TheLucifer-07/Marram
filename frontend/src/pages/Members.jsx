import { useState } from 'react'
import { UserMinus, UserPlus } from 'lucide-react'
import PageHeader from '../components/app/PageHeader'
import Button from '../components/ui/Button'
import Avatar from '../components/ui/Avatar'
import Modal from '../components/ui/Modal'
import Drawer from '../components/ui/Drawer'
import { Link } from 'react-router-dom'
import { DueText } from '../components/app/TaskList'
import { StatusBadge } from '../components/ui/Badges'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import { RoleBadge } from '../components/ui/Badges'
import { Select, TextInput } from '../components/ui/Field'
import { ErrorState, Skeleton } from '../components/ui/States'
import { useToast } from '../components/ui/Toast'
import { Api, errorMessage } from '../lib/api'
import { ROLE_META } from '../lib/constants'
import { formatDate, validEmail } from '../lib/format'
import { useAsync } from '../hooks'
import { useAuth } from '../context/AuthContext'
import { useWorkspace } from '../context/WorkspaceContext'

export default function Members() {
  const { profile } = useAuth()
  const { current, isOwner, reload: reloadWorkspaces } = useWorkspace()
  const toast = useToast()
  const members = useAsync(() => Api.members(current.id), [current.id])
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ email: '', role: 'MEMBER' })
  const [formError, setFormError] = useState(null)
  const [removing, setRemoving] = useState(null)
  const [viewing, setViewing] = useState(null)
  const work = useAsync(() => Api.workspaceTasks(current.id, { assigneeId: viewing.userId, open: true, sort: 'dueDate,asc', size: 10 }), [current.id, viewing?.userId], { enabled: Boolean(viewing) })
  const [busy, setBusy] = useState(false)

  async function add(e) {
    e.preventDefault()
    if (!validEmail(form.email)) return setFormError('Enter a valid email address.')
    setBusy(true); setFormError(null)
    try {
      await Api.addMember(current.id, { email: form.email.trim(), role: form.role })
      toast.success('Member added'); setAdding(false); setForm({ email: '', role: 'MEMBER' }); members.reload(); reloadWorkspaces()
    } catch (err) { setFormError(errorMessage(err)) } finally { setBusy(false) }
  }
  async function changeRole(m, role) {
    try { await Api.updateMember(current.id, m.userId, { role }); toast.success(`${m.fullName} is now a ${ROLE_META[role].label.toLowerCase()}`) } catch (e) { toast.error(errorMessage(e)) }
    members.reload()
  }
  async function remove() {
    setBusy(true)
    try { await Api.removeMember(current.id, removing.userId); toast.success(`${removing.fullName} was removed`); setRemoving(null); members.reload(); reloadWorkspaces() }
    catch (e) { toast.error(errorMessage(e)); setRemoving(null) } finally { setBusy(false) }
  }

  return (
    <>
      <PageHeader title="Members" subtitle={isOwner ? 'Add teammates who already have a Marram account and set their role.' : 'The people in this workspace and what each can do.'}
        actions={isOwner && <Button icon={UserPlus} onClick={() => setAdding(true)}>Add member</Button>} />
      {members.error && <ErrorState message={members.error} onRetry={members.reload} />}
      {members.loading && !members.data && <Skeleton className="h-48" />}
      {members.data && (
        <ul className="card divide-y divide-line">
          <li className="hidden grid-cols-[minmax(0,1.6fr)_110px_100px_150px_auto] gap-4 px-4 py-2 md:grid"><span className="eyebrow">Member</span><span className="eyebrow">Role</span><span className="eyebrow">Open tasks</span><span className="eyebrow">Joined</span><span /></li>
          {members.data.map((m) => (
            <li key={m.userId} className="grid items-center gap-x-4 gap-y-2 px-4 py-3 md:grid-cols-[minmax(0,1.6fr)_110px_100px_150px_auto]">
              <button type="button" onClick={() => setViewing(m)} className="flex min-w-0 items-center gap-3 text-left" aria-label={`View work for ${m.fullName}`}>
                <Avatar user={{ id: m.userId, ...m }} size={36} />
                <span className="min-w-0"><span className="block truncate text-sm font-medium hover:text-primary">{m.fullName}{m.userId === profile.id && <span className="ml-2 text-xs font-normal text-muted">you</span>}</span><span className="block truncate text-xs text-muted">{m.email}</span></span>
              </button>
              <span>{isOwner && m.role !== 'OWNER' ? (
                <select aria-label={`Role for ${m.fullName}`} className="input w-auto py-1" value={m.role} onChange={(e) => changeRole(m, e.target.value)}>
                  <option value="LEAD">Lead</option><option value="MEMBER">Member</option>
                </select>) : <RoleBadge role={m.role} />}</span>
              <span className="text-sm tabular-nums">{m.openTasks}<span className="ml-1 text-xs text-muted md:hidden">open tasks</span></span>
              <span className="text-xs text-muted">{formatDate(m.joinedAt.slice(0, 10))}</span>
              <span className="justify-self-end">{isOwner && m.role !== 'OWNER' && <Button variant="ghost" size="sm" icon={UserMinus} aria-label={`Remove ${m.fullName}`} onClick={() => setRemoving(m)} />}</span>
            </li>
          ))}
        </ul>
      )}

      <Drawer open={Boolean(viewing)} onClose={() => setViewing(null)} title={viewing?.fullName} description={viewing ? `${ROLE_META[viewing.role].label} · ${viewing.email}` : ''}>
        <h3 className="eyebrow mb-2">Open tasks</h3>
        {work.loading && !work.data && <Skeleton className="h-24" />}
        {work.error && <ErrorState message={work.error} onRetry={work.reload} />}
        {work.data?.content.length === 0 && <p className="text-sm text-muted">Nothing open is assigned to {viewing?.fullName.split(' ')[0]}.</p>}
        <ul className="divide-y divide-line">
          {work.data?.content.map((t) => (
            <li key={t.id}><Link to={`/app/tasks/${t.id}`} className="block py-2.5">
              <span className="block text-sm font-medium hover:text-primary">{t.title}</span>
              <span className="mt-1 flex items-center gap-3"><StatusBadge status={t.status} /><DueText task={t} /></span>
              <span className="mt-0.5 block text-xs text-muted">{t.projectName}</span>
            </Link></li>
          ))}
        </ul>
        {work.data?.totalElements > 10 && <p className="mt-3 text-xs text-muted">Showing 10 of {work.data.totalElements}.</p>}
      </Drawer>

      <Modal open={adding} onClose={() => setAdding(false)} title="Add a member" description="They need to have signed up for Marram with this email first.">
        <form onSubmit={add} className="space-y-4" noValidate>
          <TextInput label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} error={formError} />
          <Select label="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="MEMBER">Member</option><option value="LEAD">Lead</option>
          </Select>
          <p className="text-xs text-muted">{ROLE_META[form.role].blurb}</p>
          <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setAdding(false)}>Cancel</Button><Button type="submit" loading={busy}>Add member</Button></div>
        </form>
      </Modal>
      <ConfirmDialog open={Boolean(removing)} danger loading={busy} title={`Remove ${removing?.fullName}?`} confirmLabel="Remove member"
        message="They lose access to this workspace right away. Tasks assigned to them become unassigned, and each change is recorded in the task history."
        onConfirm={remove} onCancel={() => setRemoving(null)} />
    </>
  )
}
