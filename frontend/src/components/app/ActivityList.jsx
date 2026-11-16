import { Link } from 'react-router-dom'
import Avatar from '../ui/Avatar'
import { describeChange } from '../../lib/activity'
import { relativeTime } from '../../lib/format'

export default function ActivityList({ items, linkTasks = true }) {
  return (
    <ol className="space-y-3">
      {items.map((a) => (
        <li key={`${a.kind ?? 'change'}-${a.id}`} className="flex gap-3">
          <Avatar user={a.changedBy} size={26} className="mt-0.5" />
          <div className="min-w-0 text-sm">
            <p>
              <span className="font-medium">{a.changedBy?.fullName ?? 'Someone'}</span>{' '}
              <span className="text-muted">{describeChange(a)}</span>
              {a.taskTitle && (<>{' '}{linkTasks && a.taskId ? <Link to={`/app/tasks/${a.taskId}`} className="font-medium hover:text-primary hover:underline">{a.taskTitle}</Link> : <span className="font-medium">{a.taskTitle}</span>}</>)}
            </p>
            {a.fieldName === 'comment' && a.newValue && <p className="mt-0.5 line-clamp-2 border-l-2 border-line pl-2 text-xs text-muted">{a.newValue}</p>}
            <p className="text-xs text-muted">{a.projectName ? `${a.projectName} · ` : ''}{relativeTime(a.createdAt)}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}
