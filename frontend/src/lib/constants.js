export const STATUSES = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'BLOCKED', 'DONE']
export const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']
export const ROLES = ['OWNER', 'LEAD', 'MEMBER']

export const STATUS_META = {
  TODO: { label: 'To do', cls: 'bg-s-todo', text: 'text-s-todo', hex: 'var(--s-todo)' },
  IN_PROGRESS: { label: 'In progress', cls: 'bg-s-progress', text: 'text-s-progress', hex: 'var(--s-progress)' },
  IN_REVIEW: { label: 'In review', cls: 'bg-s-review', text: 'text-s-review', hex: 'var(--s-review)' },
  BLOCKED: { label: 'Blocked', cls: 'bg-s-blocked', text: 'text-s-blocked', hex: 'var(--s-blocked)' },
  DONE: { label: 'Done', cls: 'bg-s-done', text: 'text-s-done', hex: 'var(--s-done)' },
}
export const PRIORITY_META = {
  LOW: { label: 'Low', text: 'text-p-low', hex: 'var(--p-low)', bars: 1 },
  MEDIUM: { label: 'Medium', text: 'text-p-medium', hex: 'var(--p-medium)', bars: 2 },
  HIGH: { label: 'High', text: 'text-p-high', hex: 'var(--p-high)', bars: 3 },
  URGENT: { label: 'Urgent', text: 'text-p-urgent', hex: 'var(--p-urgent)', bars: 4 },
}
export const ROLE_META = {
  OWNER: { label: 'Owner', blurb: 'Runs the workspace: members, roles and settings. Every workspace has exactly one.' },
  LEAD: { label: 'Lead', blurb: 'Creates and edits projects and tasks, and assigns work to anyone in the workspace.' },
  MEMBER: { label: 'Member', blurb: 'Sees everything in the workspace, moves the tasks assigned to them and comments.' },
}
export const PROJECT_STATUS_META = {
  ACTIVE: { label: 'Active', cls: 'text-s-progress' },
  COMPLETED: { label: 'Completed', cls: 'text-s-done' },
  ARCHIVED: { label: 'Archived', cls: 'text-muted' },
}
export const FIELD_LABELS = {
  created: 'created the task',
  status: 'status',
  priority: 'priority',
  assignee: 'assignee',
  dueDate: 'due date',
  deleted: 'deleted the task',
}
