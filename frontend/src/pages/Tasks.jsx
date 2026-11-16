import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ListChecks, Plus, X } from 'lucide-react'
import PageHeader from '../components/app/PageHeader'
import Button from '../components/ui/Button'
import Pagination from '../components/ui/Pagination'
import { EmptyState, ErrorState, Skeleton } from '../components/ui/States'
import TaskFilters from '../components/app/TaskFilters'
import TaskList from '../components/app/TaskList'
import TaskFormModal from '../components/app/TaskFormModal'
import { Api } from '../lib/api'
import { useAsync, useDebounced } from '../hooks'
import { useAuth } from '../context/AuthContext'
import { useWorkspace } from '../context/WorkspaceContext'

/** Scope and quick filters live in the URL so dashboard cards can deep-link here and the back button works. */
export default function Tasks() {
  const { profile } = useAuth()
  const { current, canManageWork } = useWorkspace()
  const navigate = useNavigate()
  const [sp, setSp] = useSearchParams()
  const mine = sp.get('scope') !== 'all'
  const openOnly = sp.get('open') === '1'
  const overdueOnly = sp.get('overdue') === '1'
  const [filters, setFilters] = useState({ q: '', status: sp.get('status') ?? '', priority: '', assigneeId: '', sort: 'dueDate,asc', page: 0 })
  const [creating, setCreating] = useState(false)
  const dq = useDebounced(filters.q)
  const assigneeId = mine ? profile.id : filters.assigneeId

  const setParam = (k, v) => setSp((prev) => { const n = new URLSearchParams(prev); if (v) n.set(k, v); else n.delete(k); return n }, { replace: true })
  const setFilter = (next) => { setFilters(next); setParam('status', next.status) }

  const members = useAsync(() => Api.members(current.id), [current.id])
  const projects = useAsync(() => Api.projects(current.id, { status: 'ACTIVE', size: 100 }), [current.id], { enabled: canManageWork })
  const res = useAsync(() => Api.workspaceTasks(current.id, { ...filters, q: dq, assigneeId, open: openOnly || undefined, overdue: overdueOnly || undefined, size: 12 }),
    [current.id, dq, filters.status, filters.priority, assigneeId, filters.sort, filters.page, openOnly, overdueOnly])
  const t = res.data

  const chip = (label, on, off) => (
    <button type="button" onClick={off} className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary">
      {label}<X size={12} aria-label={`Clear ${label}`} />
    </button>
  )

  return (
    <>
      <PageHeader title="Tasks" subtitle={mine ? 'Tasks assigned to you across every project.' : `Every task in ${current.name}.`}
        actions={canManageWork && <Button icon={Plus} onClick={() => setCreating(true)} disabled={!projects.data?.content?.length}>New task</Button>} />
      <div className="mb-4 space-y-3">
        <TaskFilters value={{ ...filters, assigneeId: mine ? '' : filters.assigneeId }} onChange={setFilter} members={mine ? [] : members.data ?? []}
          extra={
            <div className="inline-flex rounded border border-line bg-surface p-0.5" role="group" aria-label="Scope">
              {[[true, 'Mine'], [false, 'Everyone']].map(([v, label]) => (
                <button key={label} type="button" aria-pressed={mine === v} onClick={() => { setParam('scope', v ? 'mine' : 'all'); setFilters({ ...filters, page: 0 }) }}
                  className={`rounded-sm px-3 py-1.5 text-sm transition-colors ${mine === v ? 'bg-primary-soft font-medium text-primary' : 'text-muted hover:text-ink'}`}>{label}</button>
              ))}
            </div>
          } />
        {(openOnly || overdueOnly) && (
          <div className="flex flex-wrap gap-2">
            {openOnly && chip('Open tasks only', true, () => setParam('open', ''))}
            {overdueOnly && chip('Overdue only', true, () => setParam('overdue', ''))}
          </div>
        )}
      </div>
      {res.error && <ErrorState message={res.error} onRetry={res.reload} />}
      {res.loading && !t && <Skeleton className="h-48" />}
      {t && t.content.length === 0 && (
        <EmptyState icon={ListChecks} title={mine ? 'Nothing assigned to you' : 'No tasks found'}>
          {mine ? 'When a lead assigns you a task it will appear here. Switch to Everyone to browse the workspace.' : 'Try clearing the filters.'}
        </EmptyState>
      )}
      {t && t.content.length > 0 && (
        <div className="space-y-4">
          <TaskList tasks={t.content} showProject />
          <Pagination page={t.page} totalPages={t.totalPages} totalElements={t.totalElements} onPage={(page) => setFilters({ ...filters, page })} />
        </div>
      )}
      <TaskFormModal open={creating} onClose={() => setCreating(false)} projects={projects.data?.content ?? []} members={members.data ?? []}
        onSaved={(task) => { setCreating(false); navigate(`/app/tasks/${task.id}`) }} />
    </>
  )
}
