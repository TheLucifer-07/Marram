import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Archive, ArrowLeft, KanbanSquare, List, ListChecks, Pencil, Plus } from 'lucide-react'
import PageHeader from '../components/app/PageHeader'
import Button from '../components/ui/Button'
import Pagination from '../components/ui/Pagination'
import { EmptyState, ErrorState, PageLoader, Skeleton } from '../components/ui/States'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import ProjectFormModal from '../components/app/ProjectFormModal'
import TaskFormModal from '../components/app/TaskFormModal'
import TaskFilters from '../components/app/TaskFilters'
import TaskList from '../components/app/TaskList'
import KanbanBoard from '../components/app/KanbanBoard'
import { useToast } from '../components/ui/Toast'
import { Api, errorMessage } from '../lib/api'
import { PROJECT_STATUS_META, STATUS_META } from '../lib/constants'
import { formatDate } from '../lib/format'
import { useAsync, useDebounced } from '../hooks'
import { useWorkspace } from '../context/WorkspaceContext'

export default function ProjectDetail() {
  const { projectId } = useParams()
  const { canManageWork } = useWorkspace()
  const toast = useToast()
  const [view, setView] = useState('list')
  const [filters, setFilters] = useState({ q: '', status: '', priority: '', assigneeId: '', sort: 'createdAt,desc', page: 0 })
  const [editing, setEditing] = useState(false)
  const [creating, setCreating] = useState(false)
  const [confirmArchive, setConfirmArchive] = useState(false)
  const [busy, setBusy] = useState(false)
  const dq = useDebounced(filters.q)

  const project = useAsync(() => Api.project(projectId), [projectId])
  const p = project.data
  const members = useAsync(() => Api.members(p.workspaceId), [p?.workspaceId], { enabled: Boolean(p) })
  const board = view === 'board'
  const tasks = useAsync(
    () => Api.projectTasks(projectId, { ...filters, q: dq, page: board ? 0 : filters.page, size: board ? 100 : 10 }),
    [projectId, dq, filters.status, filters.priority, filters.assigneeId, filters.sort, filters.page, board],
  )

  /** Resolves true when the server accepted the move. The board rolls back its optimistic state on false. */
  async function move(task, status) {
    try {
      await Api.setTaskStatus(task.id, status)
      toast.success(`Moved to ${STATUS_META[status].label}`)
      tasks.reload(); project.reload()
      return true
    } catch (e) { toast.error(errorMessage(e)); return false }
  }
  async function archive() {
    setBusy(true)
    try { await Api.archiveProject(projectId); toast.success('Project archived'); setConfirmArchive(false); project.reload() }
    catch (e) { toast.error(errorMessage(e)) } finally { setBusy(false) }
  }

  if (project.loading && !p) return <PageLoader />
  if (project.error && !p) return <ErrorState message={project.error} onRetry={project.reload} />
  const archived = p.status === 'ARCHIVED'
  const t = tasks.data
  const filtered = Boolean(dq || filters.status || filters.priority || filters.assigneeId)

  return (
    <>
      <Link to="/app/projects" className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"><ArrowLeft size={14} /> Projects</Link>
      <PageHeader title={p.name}
        subtitle={<><span className={`font-medium ${PROJECT_STATUS_META[p.status].cls}`}>{PROJECT_STATUS_META[p.status].label}</span> · {formatDate(p.startDate)} to {p.dueDate ? formatDate(p.dueDate) : 'no end date'}</>}
        actions={canManageWork && !archived && (<>
          <Button variant="secondary" icon={Pencil} onClick={() => setEditing(true)}>Edit</Button>
          <Button variant="secondary" icon={Archive} onClick={() => setConfirmArchive(true)}>Archive</Button>
          <Button icon={Plus} onClick={() => setCreating(true)}>New task</Button>
        </>)} />
      {p.description && <p className="-mt-3 mb-5 max-w-2xl text-sm text-muted">{p.description}</p>}
      <div className="mb-6 flex items-center gap-4">
        <div className="h-2 max-w-xs flex-1 overflow-hidden rounded-full bg-sunken"><div className="h-full rounded-full bg-primary" style={{ width: `${p.progress}%` }} /></div>
        <span className="text-sm text-muted">{p.completedTasks} of {p.totalTasks} tasks done ({p.progress}%)</span>
      </div>
      {archived && <p className="mb-4 rounded border border-line bg-sunken px-3 py-2 text-sm text-muted">This project is archived. It stays readable, but tasks can no longer be created or changed.</p>}

      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1"><TaskFilters value={filters} onChange={setFilters} members={members.data ?? []} /></div>
        <div className="inline-flex rounded border border-line bg-surface p-0.5" role="group" aria-label="View">
          {[['list', List, 'List'], ['board', KanbanSquare, 'Board']].map(([k, Icon, label]) => (
            <button key={k} type="button" aria-pressed={view === k} onClick={() => setView(k)}
              className={`inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-sm ${view === k ? 'bg-primary-soft font-medium text-primary' : 'text-muted hover:text-ink'}`}><Icon size={15} />{label}</button>
          ))}
        </div>
      </div>

      {tasks.error && <ErrorState message={tasks.error} onRetry={tasks.reload} />}
      {tasks.loading && !t && <Skeleton className="h-48" />}
      {t && t.content.length === 0 && (
        <EmptyState icon={ListChecks} title={filtered ? 'No tasks match these filters' : 'No tasks yet'}
          action={canManageWork && !archived && !filtered ? <Button icon={Plus} onClick={() => setCreating(true)}>Add the first task</Button> : null}>
          {filtered ? 'Clear a filter or search for something else.' : canManageWork ? 'Break the project into tasks and assign each one to a teammate.' : 'A lead or owner will add tasks here.'}
        </EmptyState>
      )}
      {t && t.content.length > 0 && (board ? <KanbanBoard tasks={t.content} onMove={move} /> : (
        <div className="space-y-4">
          <TaskList tasks={t.content} />
          <Pagination page={t.page} totalPages={t.totalPages} totalElements={t.totalElements} onPage={(page) => setFilters({ ...filters, page })} />
        </div>
      ))}

      <ProjectFormModal open={editing} onClose={() => setEditing(false)} project={p} onSaved={() => { setEditing(false); project.reload() }} />
      <TaskFormModal open={creating} onClose={() => setCreating(false)} projectId={p.id} members={members.data ?? []} onSaved={() => { setCreating(false); tasks.reload(); project.reload() }} />
      <ConfirmDialog open={confirmArchive} danger loading={busy} title="Archive this project?" confirmLabel="Archive project"
        message="Archived projects stay readable, but nobody can add or change tasks in them. This cannot be undone from the app."
        onConfirm={archive} onCancel={() => setConfirmArchive(false)} />
    </>
  )
}
