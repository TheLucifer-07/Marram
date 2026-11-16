import { Link } from 'react-router-dom'
import Avatar from '../ui/Avatar'
import { RoleBadge } from '../ui/Badges'

export default function TeamPanel({ workload, unassigned }) {
  const max = Math.max(1, ...workload.map((w) => w.openTasks))
  return (
    <div>
      <ul className="space-y-3">
        {workload.slice(0, 6).map((w) => (
          <li key={w.userId} className="flex items-center gap-3">
            <Avatar user={{ id: w.userId, fullName: w.fullName, avatarUrl: w.avatarUrl }} size={30} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium">{w.fullName}</span>
                <span className="shrink-0 text-xs tabular-nums text-muted">{w.openTasks} open{w.overdueTasks > 0 && <span className="ml-1.5 text-danger">{w.overdueTasks} late</span>}</span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-sunken">
                  <div className="flex h-full" style={{ width: `${(w.openTasks / max) * 100}%` }}>
                    <div className="h-full bg-primary" style={{ flex: Math.max(w.openTasks - w.overdueTasks, 0) }} />
                    <div className="h-full bg-danger" style={{ flex: w.overdueTasks }} />
                  </div>
                </div>
                <RoleBadge role={w.role} />
              </div>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-4 flex items-center justify-between text-xs text-muted">
        <span>{unassigned > 0 ? `${unassigned} open ${unassigned === 1 ? 'task is' : 'tasks are'} unassigned` : 'Every open task has an owner'}</span>
        <Link to="/app/members" className="font-medium text-primary hover:underline">All members</Link>
      </p>
    </div>
  )
}
