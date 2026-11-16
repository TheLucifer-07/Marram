import { Search } from 'lucide-react'
import { PRIORITIES, PRIORITY_META, STATUSES, STATUS_META } from '../../lib/constants'

export const SORTS = [
  { value: 'createdAt,desc', label: 'Newest first' },
  { value: 'dueDate,asc', label: 'Due soonest' },
  { value: 'priority,desc', label: 'Highest priority' },
  { value: 'status,asc', label: 'Workflow order' },
  { value: 'title,asc', label: 'Title A to Z' },
]

export default function TaskFilters({ value, onChange, members = [], extra }) {
  const set = (k) => (e) => onChange({ ...value, [k]: e.target.value, page: 0 })
  return (
    <div className="flex flex-wrap items-center gap-2" role="search" aria-label="Filter tasks">
      <label className="relative basis-full sm:min-w-[200px] sm:flex-1 sm:basis-0">
        <span className="sr-only">Search tasks</span>
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input className="input pl-9" placeholder="Search by title or description" value={value.q} onChange={set('q')} />
      </label>
      <select aria-label="Status" className="input w-[calc(50%-0.25rem)] sm:w-auto" value={value.status} onChange={set('status')}>
        <option value="">All statuses</option>
        {STATUSES.map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
      </select>
      <select aria-label="Priority" className="input w-[calc(50%-0.25rem)] sm:w-auto" value={value.priority} onChange={set('priority')}>
        <option value="">All priorities</option>
        {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_META[p].label}</option>)}
      </select>
      {members.length > 0 && (
        <select aria-label="Assignee" className="input w-[calc(50%-0.25rem)] sm:w-auto" value={value.assigneeId} onChange={set('assigneeId')}>
          <option value="">Anyone</option>
          {members.map((m) => <option key={m.userId} value={m.userId}>{m.fullName}</option>)}
        </select>
      )}
      <select aria-label="Sort" className="input w-[calc(50%-0.25rem)] sm:w-auto" value={value.sort} onChange={set('sort')}>
        {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
      </select>
      {extra}
    </div>
  )
}
