import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarDays, Pencil, Trash2 } from 'lucide-react'
import Button from '../components/ui/Button'
import Avatar from '../components/ui/Avatar'
import Pagination from '../components/ui/Pagination'
import { PriorityMark, StatusBadge } from '../components/ui/Badges'
import { ErrorState, PageLoader } from '../components/ui/States'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import TaskFormModal from '../components/app/TaskFormModal'
import ActivityList from '../components/app/ActivityList'
import { TextArea } from '../components/ui/Field'
import { useToast } from '../components/ui/Toast'
import { Api, errorMessage } from '../lib/api'
import { STATUS_META } from '../lib/constants'
import { formatDate, relativeTime } from '../lib/format'
import { DueText } from '../components/app/TaskList'
import { useAsync } from '../hooks'
import { useWorkspace } from '../context/WorkspaceContext'

export default function TaskDetails() {
  const { taskId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { select, workspaces, current, canManageWork } = useWorkspace()
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [busy, setBusy] = useState(false)
  const [comment, setComment] = useState('')
  const [commentError, setCommentError] = useState(null)
  const [cPage, setCPage] = useState(0)
  const [hPage, setHPage] = useState(0)

  const task = useAsync(async () => {
    const t = await Api.task(taskId)
    if (t.workspaceId !== current?.id && workspaces.some((w) => w.id === t.workspaceId)) select(t.workspaceId)
    return t
  }, [taskId])
  const t = task.data
  const members = useAsync(() => Api.members(t.workspaceId), [t?.workspaceId], { enabled: Boolean(t) && canManageWork })
  const comments = useAsync(() => Api.comments(taskId, { page: cPage, size: 20 }), [taskId, cPage])
  const history = useAsync(() => Api.history(taskId, { page: hPage, size: 15 }), [taskId, hPage])

  async function act(fn, okMsg) {
    setBusy(true)
    try { await fn(); if (okMsg) toast.success(okMsg); task.reload(); history.reload() } catch (e) { toast.error(errorMessage(e)) } finally { setBusy(false) }
  }
  async function postComment(e) {
    e.preventDefault()
    if (!comment.trim()) return setCommentError('Write something before posting.')
    setBusy(true); setCommentError(null)
    try { await Api.addComment(taskId, comment.trim()); setComment(''); setCPage(0); comments.reload() } catch (err) { setCommentError(errorMessage(err)) } finally { setBusy(false) }
  }
  async function remove() {
    setBusy(true)
    try { await Api.deleteTask(taskId); toast.success('Task deleted'); navigate(`/app/projects/${t.projectId}`, { replace: true }) }
    catch (e) { toast.error(errorMessage(e)); setBusy(false); setConfirmDelete(false) }
  }

  if (task.loading && !t) return <PageLoader />
  if (task.error && !t) return <ErrorState message={task.error} onRetry={task.reload} />

  return (
    <>
      <Link to={`/app/projects/${t.projectId}`} className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"><ArrowLeft size={14} /> {t.projectName}</Link>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-8">
          <header>
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-2xl font-semibold sm:text-3xl">{t.title}</h1>
              {t.canEdit && (
                <div className="flex shrink-0 gap-2">
                  <Button variant="secondary" size="sm" icon={Pencil} onClick={() => setEditing(true)}>Edit</Button>
                  <Button variant="ghost" size="sm" icon={Trash2} aria-label="Delete task" onClick={() => setConfirmDelete(true)} />
                </div>
              )}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-4"><StatusBadge status={t.status} /><PriorityMark priority={t.priority} /><DueText task={t} /></div>
            <p className={`mt-5 max-w-2xl whitespace-pre-wrap text-sm leading-relaxed ${t.description ? '' : 'text-muted'}`}>{t.description || 'No description yet.'}</p>
          </header>

          <section aria-labelledby="comments-h">
            <h2 id="comments-h" className="mb-3 text-lg font-semibold">Comments</h2>
            <form onSubmit={postComment} className="mb-4 space-y-2" noValidate>
              <TextArea aria-label="Add a comment" rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Share an update or ask a question" error={commentError} />
              <div className="flex justify-end"><Button type="submit" size="sm" loading={busy && Boolean(comment)}>Post comment</Button></div>
            </form>
            {comments.error && <ErrorState message={comments.error} onRetry={comments.reload} />}
            {comments.data?.content.length === 0 && <p className="text-sm text-muted">No comments yet.</p>}
            <ul className="space-y-4">
              {comments.data?.content.map((c) => (
                <li key={c.id} className="flex gap-3"><Avatar user={c.author} size={30} />
                  <div className="min-w-0"><p className="text-sm"><span className="font-medium">{c.author.fullName}</span> <span className="text-xs text-muted">{relativeTime(c.createdAt)}</span></p>
                    <p className="mt-0.5 whitespace-pre-wrap text-sm">{c.content}</p></div></li>
              ))}
            </ul>
            {comments.data && <div className="mt-4"><Pagination page={comments.data.page} totalPages={comments.data.totalPages} totalElements={comments.data.totalElements} onPage={setCPage} /></div>}
          </section>
        </div>

        <aside aria-label="Task details" className="space-y-6">
          <section className="card divide-y divide-line">
            <div className="p-4">
              <h2 className="mb-2 text-sm font-semibold">Status</h2>
              {t.allowedTransitions.length === 0 ? <p className="text-sm text-muted">{t.canChangeStatus ? 'No further moves from here.' : 'Only the assignee, a lead or the owner can change status.'}</p> : (
                <div className="flex flex-wrap gap-2">{t.allowedTransitions.map((s) => (
                  <Button key={s} variant="secondary" size="sm" disabled={busy} onClick={() => act(() => Api.setTaskStatus(t.id, s), `Moved to ${STATUS_META[s].label}`)}>Move to {STATUS_META[s].label}</Button>
                ))}</div>
              )}
            </div>
            <div className="p-4">
              <h2 className="mb-2 text-sm font-semibold">Assignee</h2>
              {canManageWork && t.canEdit ? (
                <select aria-label="Assignee" className="input" value={t.assignee?.id ?? ''} disabled={busy}
                  onChange={(e) => act(() => Api.setTaskAssignee(t.id, e.target.value ? Number(e.target.value) : null), 'Assignee updated')}>
                  <option value="">Unassigned</option>
                  {(members.data ?? []).map((m) => <option key={m.userId} value={m.userId}>{m.fullName}</option>)}
                </select>
              ) : t.assignee ? <div className="flex items-center gap-2 text-sm"><Avatar user={t.assignee} size={24} />{t.assignee.fullName}</div> : <p className="text-sm text-muted">Unassigned</p>}
            </div>
            <dl className="space-y-2 p-4 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-muted">Created by</dt><dd className="truncate">{t.createdBy.fullName}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted">Created</dt><dd>{formatDate(t.createdAt.slice(0, 10))}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted">Due</dt><dd className="inline-flex items-center gap-1"><CalendarDays size={13} aria-hidden="true" />{t.dueDate ? formatDate(t.dueDate) : 'None'}</dd></div>
            </dl>
          </section>

          <section aria-labelledby="history-h">
            <h2 id="history-h" className="mb-3 text-sm font-semibold">History</h2>
            {history.error && <ErrorState message={history.error} onRetry={history.reload} />}
            {history.data && <ActivityList items={history.data.content} linkTasks={false} />}
            {history.data && <div className="mt-3"><Pagination page={history.data.page} totalPages={history.data.totalPages} totalElements={history.data.totalElements} onPage={setHPage} /></div>}
          </section>
        </aside>
      </div>

      <TaskFormModal open={editing} onClose={() => setEditing(false)} task={t} onSaved={() => { setEditing(false); task.reload(); history.reload() }} />
      <ConfirmDialog open={confirmDelete} danger loading={busy} title="Delete this task?" confirmLabel="Delete task"
        message="The task disappears from lists and the board. Its history is kept for audit."
        onConfirm={remove} onCancel={() => setConfirmDelete(false)} />
    </>
  )
}
