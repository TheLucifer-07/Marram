import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Activity as ActivityIcon, AlertTriangle, CheckCircle2, FolderKanban, Gauge, ListTodo, PlayCircle, Plus, RefreshCw, Users } from 'lucide-react'
import Button from '../components/ui/Button'
import { EmptyState, ErrorState, Skeleton } from '../components/ui/States'
import ActivityList from '../components/app/ActivityList'
import ProjectFormModal from '../components/app/ProjectFormModal'
import TaskFormModal from '../components/app/TaskFormModal'
import { DueText } from '../components/app/TaskList'
import { PriorityMark } from '../components/ui/Badges'
import KpiCard from '../components/dashboard/KpiCard'
import ProjectHealth from '../components/dashboard/ProjectHealth'
import MyWork from '../components/dashboard/MyWork'
import TeamPanel from '../components/dashboard/TeamPanel'
import { PriorityBars, StatusDonut, TrendChart } from '../components/dashboard/Charts'
import { Api } from '../lib/api'
import { fadeUp, stagger } from '../lib/motion'
import { useAsync } from '../hooks'
import { useAuth } from '../context/AuthContext'
import { useWorkspace } from '../context/WorkspaceContext'

const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening' }
const today = () => new Intl.DateTimeFormat('en', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())

function Panel({ title, icon: Icon, action, children, className = '' }) {
  return (
    <motion.section variants={fadeUp} className={`card min-w-0 p-5 ${className}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold">{Icon && <Icon size={15} className="text-muted" aria-hidden="true" />}{title}</h2>
        {action}
      </div>
      {children}
    </motion.section>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-[104px]" />)}</div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]"><div className="space-y-4"><Skeleton className="h-72" /><Skeleton className="h-64" /></div><div className="space-y-4"><Skeleton className="h-56" /><Skeleton className="h-64" /></div></div>
    </div>
  )
}

export default function Dashboard() {
  const { profile } = useAuth()
  const { current, canManageWork } = useWorkspace()
  const navigate = useNavigate()
  const [newProject, setNewProject] = useState(false)
  const [newTask, setNewTask] = useState(false)
  const dash = useAsync(() => Api.dashboard(current.id), [current.id])
  const projects = useAsync(() => Api.projects(current.id, { status: 'ACTIVE', size: 100 }), [current.id], { enabled: canManageWork })
  const members = useAsync(() => Api.members(current.id), [current.id], { enabled: canManageWork })
  const d = dash.data
  const open = d ? d.totalTasks - d.completedTasks : 0
  const delta = d ? d.completedLast7Days - d.completedPrevious7Days : null
  const empty = d && d.totalTasks === 0 && d.totalProjects === 0
  const perMember = d && d.workload.length ? Math.round((open / d.workload.length) * 10) / 10 : 0

  return (
    <>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="eyebrow">{today()} · {current.name}</p>
          <h1 className="mt-1 text-2xl font-semibold sm:text-[28px]">{greeting()}, {profile?.fullName?.split(' ')[0]}</h1>
          <p className="mt-1 text-sm text-muted" aria-live="polite">
            {!d ? 'Loading your workspace…' : empty ? 'Nothing here yet. Start with a project.'
              : `${open} open ${open === 1 ? 'task' : 'tasks'} across ${d.totalProjects} active ${d.totalProjects === 1 ? 'project' : 'projects'}`
                + (d.overdueTasks ? `, ${d.overdueTasks} overdue` : '') + (d.blockedTasks ? `, ${d.blockedTasks} blocked` : '') + '.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" icon={RefreshCw} onClick={dash.reload} disabled={dash.loading} aria-label="Refresh dashboard" className={dash.loading ? '[&_svg]:animate-spin' : ''}>Refresh</Button>
          {canManageWork && (<>
            <Button variant="secondary" icon={FolderKanban} onClick={() => setNewProject(true)}>New project</Button>
            <Button icon={Plus} onClick={() => setNewTask(true)} disabled={!projects.data?.content?.length}>New task</Button>
          </>)}
        </div>
      </header>

      {dash.error && <ErrorState message={dash.error} onRetry={dash.reload} />}
      {dash.loading && !d && <DashboardSkeleton />}

      {empty && (
        <EmptyState icon={FolderKanban} title="This workspace is empty"
          action={canManageWork ? <Button icon={Plus} onClick={() => setNewProject(true)}>Create the first project</Button> : null}>
          {canManageWork ? 'Create a project, add tasks and assign each one to a teammate. The dashboard fills in as work moves.' : 'A lead or owner will add projects here. Tasks assigned to you will show up on this page.'}
        </EmptyState>
      )}

      {d && !empty && (
        <motion.div variants={stagger(0.06)} initial="hidden" animate="show" className="space-y-4">
          <motion.div variants={fadeUp} className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <KpiCard label="Projects" icon={FolderKanban} value={d.totalProjects} sub="in progress now" to="/app/projects" />
            <KpiCard label="Open tasks" icon={ListTodo} value={open} sub={`of ${d.totalTasks} total`} to="/app/tasks?scope=all&open=1" />
            <KpiCard label="Completed" icon={CheckCircle2} value={d.completedTasks} tone="good" delta={delta} sub={d.completedLast7Days + ' in the last 7 days'} to="/app/tasks?scope=all&status=DONE" />
            <KpiCard label="In progress" icon={PlayCircle} value={d.inProgressTasks} sub={d.blockedTasks ? `${d.blockedTasks} blocked` : 'none blocked'} tone={d.blockedTasks ? 'warn' : 'neutral'} to="/app/tasks?scope=all&status=IN_PROGRESS" />
            <KpiCard label="Overdue" icon={AlertTriangle} value={d.overdueTasks} tone={d.overdueTasks ? 'danger' : 'good'} sub={d.overdueTasks ? 'need attention' : 'all on schedule'} to="/app/tasks?scope=all&overdue=1" />
            <KpiCard label="Team load" icon={Gauge} value={perMember} format={(n) => n.toLocaleString(undefined, { maximumFractionDigits: 1 })} sub="open per member" to="/app/members" />
          </motion.div>

          {/* Below xl the two columns dissolve (display: contents) and panels follow the order-* classes, so deadlines and team come before the long activity feed. */}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_380px] xl:items-start">
            <div className="contents xl:block xl:min-w-0 xl:space-y-4">
              <Panel title="My work" icon={ListTodo} className="order-1 md:col-span-2 xl:col-span-1 xl:order-none"><MyWork workspaceId={current.id} userId={profile.id} overdueCount={d.workload.find((w) => w.userId === profile.id)?.overdueTasks} /></Panel>

              <Panel title="Project health" icon={FolderKanban} className="order-2 md:col-span-2 xl:col-span-1 xl:order-none" action={<Link to="/app/projects" className="text-xs font-medium text-primary hover:underline">All projects</Link>}>
                {d.projectProgress.length === 0 ? <p className="text-sm text-muted">No active projects.</p> : <ProjectHealth projects={d.projectProgress} />}
              </Panel>

              <Panel title="Completed per day" icon={CheckCircle2} className="order-6 md:col-span-2 xl:col-span-1 xl:order-none"
                action={<span className="text-xs text-muted tabular-nums">{d.completedLast7Days} this week, {d.completedPrevious7Days} last week</span>}>
                {d.completionTrend.every((p) => p.completed === 0)
                  ? <p className="py-6 text-center text-sm text-muted">No tasks were completed in the last 14 days. Moves to Done will chart here.</p>
                  : <TrendChart points={d.completionTrend} />}
              </Panel>

              <Panel title="Recent activity" icon={ActivityIcon} className="order-7 md:col-span-2 xl:col-span-1 xl:order-none">
                {d.recentActivity.length === 0 ? <p className="text-sm text-muted">Task changes and comments will appear here.</p> : <ActivityList items={d.recentActivity} />}
              </Panel>
            </div>

            <div className="contents xl:block xl:min-w-0 xl:space-y-4">
              <Panel title="Task mix" icon={ListTodo} className="order-4 xl:order-none">
                {d.totalTasks === 0 ? <p className="text-sm text-muted">No tasks yet.</p> : (<>
                  <StatusDonut byStatus={d.tasksByStatus} total={d.totalTasks} />
                  <p className="eyebrow mb-1 mt-5">By priority</p>
                  <PriorityBars byPriority={d.tasksByPriority} />
                </>)}
              </Panel>

              {d.overdueList.length + d.upcomingDeadlines.length > 0 && (
                <Panel title="Deadlines" icon={AlertTriangle} className="order-3 xl:order-none">
                  <ul className="divide-y divide-line">
                    {[...d.overdueList, ...d.upcomingDeadlines.filter((u) => !d.overdueList.some((o) => o.id === u.id))].slice(0, 6).map((t) => (
                      <li key={t.id}><Link to={`/app/tasks/${t.id}`} className="flex items-center justify-between gap-3 py-2">
                        <span className="min-w-0"><span className="block truncate text-sm font-medium hover:text-primary">{t.title}</span><span className="block truncate text-xs text-muted">{t.assignee?.fullName ?? 'Unassigned'}</span></span>
                        <span className="flex shrink-0 flex-col items-end gap-0.5"><DueText task={t} /><PriorityMark priority={t.priority} showLabel={false} /></span>
                      </Link></li>
                    ))}
                  </ul>
                </Panel>
              )}

              <Panel title="Team" icon={Users} className="order-5 md:col-span-2 xl:col-span-1 xl:order-none"><TeamPanel workload={d.workload} unassigned={d.unassignedOpenTasks} /></Panel>

            </div>
          </div>
        </motion.div>
      )}

      <ProjectFormModal open={newProject} onClose={() => setNewProject(false)} workspaceId={current.id}
        onSaved={(p) => { setNewProject(false); navigate(`/app/projects/${p.id}`) }} />
      <TaskFormModal open={newTask} onClose={() => setNewTask(false)} projects={projects.data?.content ?? []} members={members.data ?? []}
        onSaved={(t) => { setNewTask(false); navigate(`/app/tasks/${t.id}`) }} />
    </>
  )
}
