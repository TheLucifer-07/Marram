import { PRIORITY_META, STATUS_META } from './constants'
import { formatShortDate } from './format'

function show(field, value) {
  if (value === null || value === undefined || value === '') return field === 'assignee' ? 'Unassigned' : 'none'
  if (field === 'status') return STATUS_META[value]?.label ?? value
  if (field === 'priority') return PRIORITY_META[value]?.label ?? value
  if (field === 'dueDate') return formatShortDate(value)
  return value
}

/** Sentence fragment for one history/activity row, e.g. "changed status from To do to Done". */
export function describeChange({ fieldName, oldValue, newValue }) {
  if (fieldName === 'comment') return 'commented on'
  if (fieldName === 'created') return 'created the task'
  if (fieldName === 'deleted') return 'deleted the task'
  const label = { status: 'status', priority: 'priority', assignee: 'assignee', dueDate: 'due date' }[fieldName] ?? fieldName
  return `changed ${label} from ${show(fieldName, oldValue)} to ${show(fieldName, newValue)}`
}
