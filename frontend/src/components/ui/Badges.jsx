import { STATUS_META, PRIORITY_META, ROLE_META } from '../../lib/constants'

export function StatusBadge({ status }) {
  const m = STATUS_META[status]
  if (!m) return null
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-line bg-surface px-2 py-0.5 text-xs font-medium ${m.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${m.cls}`} aria-hidden="true" />
      {m.label}
    </span>
  )
}

export function PriorityMark({ priority, showLabel = true }) {
  const m = PRIORITY_META[priority]
  if (!m) return null
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${m.text}`} title={`${m.label} priority`}>
      <span className="flex items-end gap-px" aria-hidden="true">
        {[1, 2, 3, 4].map((i) => (
          <span key={i} style={{ height: 4 + i * 2 }} className={`w-[3px] rounded-sm ${i <= m.bars ? 'bg-current' : 'bg-line'}`} />
        ))}
      </span>
      {showLabel ? m.label : <span className="sr-only">{m.label} priority</span>}
    </span>
  )
}

export function RoleBadge({ role }) {
  const cls = role === 'OWNER' ? 'bg-primary-soft text-primary' : role === 'LEAD' ? 'bg-sunken text-ink' : 'bg-sunken text-muted'
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{ROLE_META[role]?.label ?? role}</span>
}
