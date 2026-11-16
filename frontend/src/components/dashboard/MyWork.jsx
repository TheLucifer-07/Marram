import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import Tabs from '../ui/Tabs'
import { EmptyState, ErrorState, Skeleton } from '../ui/States'
import { PriorityMark } from '../ui/Badges'
import { DueText } from '../app/TaskList'
import { Api } from '../../lib/api'
import { STATUS_META } from '../../lib/constants'
import { relativeTime } from '../../lib/format'
import { useAsync } from '../../hooks'

const VIEWS = {
  due: { label: 'Due soon', params: { sort: 'dueDate,asc' }, empty: 'Nothing assigned to you is open. Enjoy the quiet.' },
  overdue: { label: 'Overdue', params: { overdue: true, sort: 'dueDate,asc' }, empty: 'No overdue work. Nice.' },
  priority: { label: 'Top priority', params: { sort: 'priority,desc' }, empty: 'No open tasks assigned to you.' },
  recent: { label: 'Recently updated', params: { sort: 'updatedAt,desc' }, empty: 'No open tasks assigned to you.' },
}

/** The signed-in person's own queue, fetched from the API per view (never filtered client-side from a bulk download). */
export default function MyWork({ workspaceId, userId, overdueCount }) {
  const [view, setView] = useState('due')
  const res = useAsync(() => Api.workspaceTasks(workspaceId, { assigneeId: userId, open: true, size: 6, ...VIEWS[view].params }), [workspaceId, userId, view])
  const tasks = res.data?.content ?? []
  return (
    <div>
      <Tabs label="My work views" value={view} onChange={setView} tabs={Object.entries(VIEWS).map(([value, v]) => ({ value, label: v.label, count: value === 'overdue' ? overdueCount : undefined }))} />
      <div role="tabpanel" className="pt-1">
        {res.error && <div className="pt-3"><ErrorState message={res.error} onRetry={res.reload} /></div>}
        {res.loading && !res.data && <div className="space-y-2 pt-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-11" />)}</div>}
        {res.data && tasks.length === 0 && <div className="pt-3"><EmptyState icon={CheckCircle2} title="All clear">{VIEWS[view].empty}</EmptyState></div>}
        {tasks.length > 0 && (
          <ul className="divide-y divide-line">
            {tasks.map((t) => (
              <li key={t.id}>
                <Link to={`/app/tasks/${t.id}`} className="group flex items-center gap-3 py-2.5">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${STATUS_META[t.status].cls}`} title={STATUS_META[t.status].label} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium group-hover:text-primary">{t.title}</span>
                    <span className="block truncate text-xs text-muted">{t.projectName}{view === 'recent' ? ` · updated ${relativeTime(t.updatedAt)}` : ''}</span>
                  </span>
                  <span className="hidden sm:block"><PriorityMark priority={t.priority} showLabel={false} /></span>
                  <span className="w-28 shrink-0 text-right"><DueText task={t} /></span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {res.data?.totalElements > tasks.length && (
          <Link to="/app/tasks?scope=mine" className="mt-2 inline-block text-sm font-medium text-primary hover:underline">View all {res.data.totalElements} assigned tasks</Link>
        )}
      </div>
    </div>
  )
}
