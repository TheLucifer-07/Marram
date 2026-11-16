import { Link } from 'react-router-dom'
import { CalendarDays } from 'lucide-react'
import { PriorityMark, StatusBadge } from '../ui/Badges'
import Avatar from '../ui/Avatar'
import { dueLabel, formatShortDate } from '../../lib/format'

export function DueText({ task }) {
  if (!task.dueDate) return <span className="text-xs text-muted">No due date</span>
  // A finished task is never "overdue": show its date plainly.
  if (task.status === 'DONE') return <span className="inline-flex items-center gap-1 text-xs text-muted"><CalendarDays size={13} aria-hidden="true" /> {formatShortDate(task.dueDate)}</span>
  const late = task.overdue
  return (
    <span className={`inline-flex items-center gap-1 text-xs ${late ? 'font-semibold text-danger' : 'text-muted'}`}>
      <CalendarDays size={13} aria-hidden="true" /> {dueLabel(task.dueDate)}
    </span>
  )
}

export default function TaskList({ tasks, showProject = false }) {
  return (
    <ul className="card divide-y divide-line overflow-hidden">
      {tasks.map((t) => (
        <li key={t.id}>
          <Link to={`/app/tasks/${t.id}`} className="grid gap-x-4 gap-y-2 px-4 py-3 transition-colors hover:bg-sunken/70 md:grid-cols-[minmax(0,1fr)_104px_92px_120px_150px] md:items-center">
            <div className="min-w-0">
              <p className={`truncate text-sm font-medium ${t.status === 'DONE' ? 'text-muted line-through' : ''}`}>{t.title}</p>
              {showProject && <p className="mt-0.5 truncate text-xs text-muted">{t.projectName}</p>}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 md:contents">
              <span><StatusBadge status={t.status} /></span>
              <span><PriorityMark priority={t.priority} /></span>
              <span><DueText task={t} /></span>
              <span className="flex min-w-0 items-center gap-2 md:justify-end">
                {t.assignee ? <><Avatar user={t.assignee} size={22} /><span className="truncate text-xs">{t.assignee.fullName}</span></> : <span className="text-xs text-muted">Unassigned</span>}
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  )
}
