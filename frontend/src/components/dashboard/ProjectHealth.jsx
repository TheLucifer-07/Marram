import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import Avatar from '../ui/Avatar'
import { dueLabel, parseDate } from '../../lib/format'
import { transitions } from '../../lib/motion'

/** Health is derived only from backend numbers: past due and unfinished, or overdue/blocked tasks inside. */
export function projectHealth(p, now = new Date()) {
  if (p.totalTasks === 0) return { key: 'empty', label: 'No tasks yet', cls: 'text-muted' }
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (p.dueDate && parseDate(p.dueDate) < today && p.progress < 100) return { key: 'behind', label: 'Past due', cls: 'text-danger' }
  if (p.overdueTasks > 0 || p.blockedTasks > 0) return { key: 'risk', label: 'At risk', cls: 'text-p-high' }
  return { key: 'on-track', label: 'On track', cls: 'text-s-done' }
}

export default function ProjectHealth({ projects }) {
  return (
    <ul className="divide-y divide-line">
      {projects.map((p) => {
        const h = projectHealth(p)
        return (
          <li key={p.projectId}>
            <Link to={`/app/projects/${p.projectId}`} className="group grid gap-x-4 gap-y-1.5 py-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] sm:items-center">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium group-hover:text-primary">{p.name}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-muted">
                  <span className={`font-medium ${h.cls}`}>{h.label}</span>
                  {p.overdueTasks > 0 && <span className="text-danger">{p.overdueTasks} overdue</span>}
                  {p.blockedTasks > 0 && <span className="text-s-blocked">{p.blockedTasks} blocked</span>}
                  {p.dueDate && <span>{dueLabel(p.dueDate)}</span>}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-sunken" role="progressbar" aria-valuenow={p.progress} aria-valuemin={0} aria-valuemax={100} aria-label={`${p.name} completion`}>
                  <motion.div className="h-full w-full origin-left rounded-full bg-primary" initial={{ scaleX: 0 }} animate={{ scaleX: p.progress / 100 }} transition={transitions.fill} />
                </div>
                <span className="w-9 text-right text-xs font-medium tabular-nums">{p.progress}%</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted sm:justify-end">
                <span className="tabular-nums">{p.completedTasks}/{p.totalTasks}</span>
                {p.createdBy && <span title={`Created by ${p.createdBy.fullName}`}><Avatar user={p.createdBy} size={20} /></span>}
              </div>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
