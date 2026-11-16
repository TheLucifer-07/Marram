// QA fixtures: a realistic, internally consistent workspace used ONLY by the browser QA harness (qa/run.mjs).
// The product never imports this file. Shapes mirror the backend DTOs (Dto.java).
const DAY = 86400000
const iso = (d) => new Date(d).toISOString()
const ymd = (offsetDays) => new Date(Date.now() + offsetDays * DAY).toISOString().slice(0, 10)
const ago = (h) => iso(Date.now() - h * 3600000)

export const people = [
  { id: 1, fullName: 'Priya Nair', email: 'priya@example.com', avatarUrl: null },
  { id: 2, fullName: 'Arjun Rao', email: 'arjun@example.com', avatarUrl: null },
  { id: 3, fullName: 'Meera Iyer', email: 'meera@example.com', avatarUrl: null },
  { id: 4, fullName: 'Kiran Das', email: 'kiran@example.com', avatarUrl: null },
  { id: 5, fullName: 'Sana Qureshi', email: 'sana@example.com', avatarUrl: null },
]
const roles = { 1: 'OWNER', 2: 'LEAD', 3: 'MEMBER', 4: 'MEMBER', 5: 'MEMBER' }

export const workspace = { id: 1, name: 'Product team', description: 'Everything we ship this quarter', myRole: 'OWNER', memberCount: 5, createdAt: ago(24 * 60) }
export const me = { ...people[0], createdAt: ago(24 * 90) }

const projectsRaw = [
  { id: 1, name: 'Website launch', description: 'Marketing site, pricing page and launch announcement', startDate: ymd(-30), dueDate: ymd(9), status: 'ACTIVE', by: 1 },
  { id: 2, name: 'Billing rework', description: 'Move to usage-based plans and clean up invoices', startDate: ymd(-45), dueDate: ymd(-2), status: 'ACTIVE', by: 2 },
  { id: 3, name: 'Onboarding flow', description: 'Shorter first-run experience with better empty states', startDate: ymd(-20), dueDate: ymd(21), status: 'ACTIVE', by: 1 },
  { id: 4, name: 'Mobile audit', description: 'Check every screen at 360 px', startDate: ymd(-60), dueDate: ymd(-20), status: 'COMPLETED', by: 4 },
]
// [id, project, title, status, priority, assignee, dueOffset, description]
const T = [
  [1, 1, 'Write launch announcement', 'TODO', 'MEDIUM', 1, 4], [2, 1, 'Design pricing page', 'IN_PROGRESS', 'HIGH', 3, 2],
  [3, 1, 'Set up analytics events', 'IN_REVIEW', 'MEDIUM', 4, 1], [4, 1, 'Fix hero layout on small screens', 'BLOCKED', 'URGENT', 5, -1],
  [5, 1, 'Agree the scope', 'DONE', 'LOW', 2, -10], [6, 1, 'Collect customer logos', 'TODO', 'LOW', null, 8],
  [7, 2, 'Migrate subscription table', 'IN_PROGRESS', 'URGENT', 2, -3], [8, 2, 'Update invoice template', 'TODO', 'HIGH', 3, -1],
  [9, 2, 'Write migration runbook', 'IN_REVIEW', 'MEDIUM', 1, 3], [10, 2, 'Backfill usage data', 'DONE', 'HIGH', 2, -6],
  [11, 3, 'Shorten sign-up form', 'IN_PROGRESS', 'MEDIUM', 1, 6], [12, 3, 'Empty state illustrations', 'TODO', 'LOW', 4, 14],
  [13, 3, 'Add workspace templates', 'TODO', 'HIGH', 1, 0], [14, 3, 'Test onboarding with five new users', 'DONE', 'MEDIUM', 1, -4],
  [15, 4, 'Audit dashboard at 360 px', 'DONE', 'HIGH', 4, -25], [16, 4, 'Audit board at 360 px', 'DONE', 'MEDIUM', 5, -22],
]
const NEXT = { TODO: ['IN_PROGRESS'], IN_PROGRESS: ['IN_REVIEW', 'BLOCKED'], BLOCKED: ['IN_PROGRESS'], IN_REVIEW: ['IN_PROGRESS', 'DONE'], DONE: ['IN_PROGRESS'] }
const summary = (id) => (id ? people.find((p) => p.id === id) : null)

export function createStore() {
  const projects = projectsRaw.map((p) => ({ ...p }))
  const tasks = T.map(([id, project, title, status, priority, assignee, due], i) => ({
    id, project, title, status, priority, assignee, due: ymd(due), description: id % 2 ? 'Short description of the work, written by the creator of the task.' : null, created: ago(24 * (20 - i)), updated: ago(i * 5 + 1),
  }))
  const history = []
  const comments = [{ id: 1, taskId: 2, author: 3, content: 'Two layout options are ready. I prefer the first because the plan names fit on one line.', createdAt: ago(5) }, { id: 2, taskId: 2, author: 1, content: 'Agreed. Go with option one and send it to review.', createdAt: ago(3) }]
  const now = Date.now()
  const log = [[2, 3, 'status', 'TODO', 'IN_PROGRESS', 20], [14, 1, 'status', 'IN_REVIEW', 'DONE', 30], [10, 2, 'status', 'IN_REVIEW', 'DONE', 52], [4, 5, 'status', 'IN_PROGRESS', 'BLOCKED', 8], [7, 2, 'priority', 'HIGH', 'URGENT', 26], [13, 1, 'assignee', 'Arjun Rao', 'Priya Nair', 40]]
  log.forEach(([taskId, by, field, o, n, h], i) => history.push({ id: i + 1, taskId, by, field, o, n, at: iso(now - h * 3600000) }))
  const key = (t) => ({ taskId: t.id })
  return { projects, tasks, history, comments, NEXT, key }
}

export function taskDto(store, t, viewerRole = 'OWNER', viewerId = 1) {
  const project = store.projects.find((p) => p.id === t.project)
  const manager = viewerRole !== 'MEMBER'
  const mayChange = manager || t.assignee === viewerId
  const next = mayChange ? NEXT[t.status].filter(() => !(t.status === 'DONE' && !manager)) : []
  return {
    id: t.id, projectId: project.id, projectName: project.name, workspaceId: 1, title: t.title, description: t.description, status: t.status, priority: t.priority,
    assignee: summary(t.assignee), createdBy: summary(1), dueDate: t.due, overdue: t.due < ymd(0) && t.status !== 'DONE', allowedTransitions: next,
    canEdit: manager, canChangeStatus: mayChange, createdAt: t.created, updatedAt: t.updated,
  }
}

export function projectDto(store, p) {
  const ts = store.tasks.filter((t) => t.project === p.id)
  const done = ts.filter((t) => t.status === 'DONE').length
  return { id: p.id, workspaceId: 1, name: p.name, description: p.description, startDate: p.startDate, dueDate: p.dueDate, status: p.status, totalTasks: ts.length, completedTasks: done, progress: ts.length ? Math.round((done * 100) / ts.length) : 0, createdBy: summary(p.by), createdAt: ago(900), updatedAt: ago(5) }
}

export function dashboardDto(store) {
  const today = ymd(0)
  const dto = store.tasks.map((t) => taskDto(store, t))
  const count = (k, vals) => Object.fromEntries(vals.map((v) => [v, store.tasks.filter((t) => t[k] === v).length]))
  const total = store.tasks.length
  const done = store.tasks.filter((t) => t.status === 'DONE').length
  const active = store.projects.filter((p) => p.status === 'ACTIVE')
  const overdue = dto.filter((t) => t.overdue && store.projects.find((p) => p.id === t.projectId).status !== 'ARCHIVED')
  const trend = Array.from({ length: 14 }, (_, i) => ({ date: ymd(i - 13), completed: [0, 1, 0, 0, 2, 1, 0, 0, 1, 0, 3, 1, 0, 2][i] }))
  const last7 = trend.slice(7).reduce((a, b) => a + b.completed, 0)
  const prev7 = trend.slice(0, 7).reduce((a, b) => a + b.completed, 0)
  const act = store.history.map((h) => { const t = store.tasks.find((x) => x.id === h.taskId); return { kind: 'change', id: h.id, taskId: t.id, taskTitle: t.title, projectName: store.projects.find((p) => p.id === t.project).name, changedBy: summary(h.by), fieldName: h.field, oldValue: h.o, newValue: h.n, createdAt: h.at } })
  store.comments.forEach((c) => { const t = store.tasks.find((x) => x.id === c.taskId); act.push({ kind: 'comment', id: c.id, taskId: t.id, taskTitle: t.title, projectName: store.projects.find((p) => p.id === t.project).name, changedBy: summary(c.author), fieldName: 'comment', oldValue: null, newValue: c.content.slice(0, 90), createdAt: c.createdAt }) })
  act.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return {
    totalProjects: active.length, totalTasks: total, completedTasks: done, pendingTasks: total - done, inProgressTasks: store.tasks.filter((t) => t.status === 'IN_PROGRESS').length,
    blockedTasks: store.tasks.filter((t) => t.status === 'BLOCKED').length, overdueTasks: overdue.length, completionPercentage: Math.round((done / total) * 10000) / 100,
    tasksByStatus: count('status', ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'BLOCKED', 'DONE']), tasksByPriority: count('priority', ['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
    projectProgress: active.map((p) => { const ts = dto.filter((t) => t.projectId === p.id); const d = ts.filter((t) => t.status === 'DONE').length; return { projectId: p.id, name: p.name, status: p.status, totalTasks: ts.length, completedTasks: d, progress: ts.length ? Math.round((d * 100) / ts.length) : 0, overdueTasks: ts.filter((t) => t.overdue).length, blockedTasks: ts.filter((t) => t.status === 'BLOCKED').length, dueDate: p.dueDate, createdBy: summary(p.by) } }),
    overdueList: overdue.slice(0, 5), upcomingDeadlines: dto.filter((t) => t.status !== 'DONE' && t.dueDate >= today && t.dueDate <= ymd(7)).slice(0, 5), recentActivity: act.slice(0, 10),
    unassignedOpenTasks: store.tasks.filter((t) => !t.assignee && t.status !== 'DONE').length, completedLast7Days: last7, completedPrevious7Days: prev7, completionTrend: trend,
    workload: people.map((p) => { const mine = dto.filter((t) => t.assignee?.id === p.id); return { userId: p.id, fullName: p.fullName, avatarUrl: null, role: roles[p.id], openTasks: mine.filter((t) => t.status !== 'DONE').length, overdueTasks: mine.filter((t) => t.overdue).length, completedTasks: mine.filter((t) => t.status === 'DONE').length } }).sort((a, b) => b.openTasks - a.openTasks),
  }
}

export const membersDto = (store) => people.map((p, i) => ({ userId: p.id, fullName: p.fullName, email: p.email, avatarUrl: null, role: roles[p.id], joinedAt: ago(24 * (60 - i * 8)), openTasks: store.tasks.filter((t) => t.assignee === p.id && t.status !== 'DONE').length }))
export const historyDto = (store, taskId) => store.history.filter((h) => h.taskId === taskId).sort((a, b) => b.at.localeCompare(a.at)).map((h) => { const t = store.tasks.find((x) => x.id === h.taskId); return { kind: 'change', id: h.id, taskId, taskTitle: t.title, projectName: store.projects.find((p) => p.id === t.project).name, changedBy: summary(h.by), fieldName: h.field, oldValue: h.o, newValue: h.n, createdAt: h.at } })
export const commentsDto = (store, taskId) => store.comments.filter((c) => c.taskId === taskId).map((c) => ({ id: c.id, taskId, author: summary(c.author), content: c.content, createdAt: c.createdAt }))
export const page = (items, p = 0, s = 10) => ({ content: items.slice(p * s, p * s + s), page: p, size: s, totalElements: items.length, totalPages: Math.max(1, Math.ceil(items.length / s)) })
