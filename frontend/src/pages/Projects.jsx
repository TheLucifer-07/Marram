import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FolderKanban, LayoutGrid, List, Plus, Search } from 'lucide-react'
import PageHeader from '../components/app/PageHeader'
import Button from '../components/ui/Button'
import Avatar from '../components/ui/Avatar'
import Pagination from '../components/ui/Pagination'
import { EmptyState, ErrorState, Skeleton } from '../components/ui/States'
import ProjectFormModal from '../components/app/ProjectFormModal'
import { Api } from '../lib/api'
import { PROJECT_STATUS_META } from '../lib/constants'
import { dueLabel } from '../lib/format'
import { fadeUp, stagger, transitions } from '../lib/motion'
import { useAsync, useDebounced, useStoredState } from '../hooks'
import { useWorkspace } from '../context/WorkspaceContext'

function Progress({ value, label }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-sunken" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <motion.div className="h-full w-full origin-left rounded-full bg-primary" initial={{ scaleX: 0 }} animate={{ scaleX: value / 100 }} transition={transitions.fill} />
    </div>
  )
}

const status = (p) => <span className={`text-xs font-medium ${PROJECT_STATUS_META[p.status].cls}`}>{PROJECT_STATUS_META[p.status].label}</span>

export default function Projects() {
  const { current, canManageWork } = useWorkspace()
  const [q, setQ] = useState('')
  const [st, setSt] = useState('')
  const [page, setPage] = useState(0)
  const [modal, setModal] = useState(false)
  const [view, setView] = useStoredState('marram.projects.view', 'grid')
  const dq = useDebounced(q)
  const res = useAsync(() => Api.projects(current.id, { q: dq, status: st, page, size: 12, sort: 'createdAt,desc' }), [current.id, dq, st, page])
  const data = res.data

  return (
    <>
      <PageHeader title="Projects" subtitle={`Everything ${current.name} is working on.`}
        actions={canManageWork && <Button icon={Plus} onClick={() => setModal(true)}>New project</Button>} />
      <div className="mb-4 flex flex-wrap gap-2">
        <label className="relative min-w-[200px] flex-1"><span className="sr-only">Search projects</span>
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input className="input pl-9" placeholder="Search projects" value={q} onChange={(e) => { setQ(e.target.value); setPage(0) }} /></label>
        <select aria-label="Status" className="input w-auto" value={st} onChange={(e) => { setSt(e.target.value); setPage(0) }}>
          <option value="">All statuses</option><option value="ACTIVE">Active</option><option value="COMPLETED">Completed</option><option value="ARCHIVED">Archived</option>
        </select>
        <div className="inline-flex rounded border border-line bg-surface p-0.5" role="group" aria-label="Layout">
          {[['grid', LayoutGrid, 'Cards'], ['list', List, 'List']].map(([k, Icon, label]) => (
            <button key={k} type="button" aria-pressed={view === k} aria-label={label} title={label} onClick={() => setView(k)}
              className={`rounded-sm px-2.5 py-1.5 transition-colors ${view === k ? 'bg-primary-soft text-primary' : 'text-muted hover:text-ink'}`}><Icon size={16} /></button>
          ))}
        </div>
      </div>

      {res.error && <ErrorState message={res.error} onRetry={res.reload} />}
      {res.loading && !data && <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-36" />)}</div>}
      {data && data.content.length === 0 && (
        <EmptyState icon={FolderKanban} title={dq || st ? 'No projects match' : 'No projects yet'}
          action={canManageWork && !dq && !st ? <Button icon={Plus} onClick={() => setModal(true)}>Create a project</Button> : null}>
          {dq || st ? 'Try a different search or status.' : canManageWork ? 'Projects hold the tasks that share a goal and a deadline.' : 'A lead or owner will add projects here.'}
        </EmptyState>
      )}
      {data && data.content.length > 0 && (
        <div className="space-y-4">
          {view === 'grid' ? (
            <motion.ul variants={stagger(0.04)} initial="hidden" animate="show" key={`g-${page}-${dq}-${st}`} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.content.map((p) => (
                <motion.li key={p.id} variants={fadeUp}>
                  <Link to={`/app/projects/${p.id}`} className="card card-hover flex h-full flex-col p-5">
                    <div className="flex items-start justify-between gap-3"><h2 className="text-base font-semibold leading-snug">{p.name}</h2>{status(p)}</div>
                    <p className="mt-1.5 line-clamp-2 min-h-[2.5rem] text-sm text-muted">{p.description || 'No description'}</p>
                    <div className="mt-4"><Progress value={p.progress} label={`${p.name} completion`} /></div>
                    <div className="mt-2.5 flex items-center justify-between text-xs text-muted">
                      <span className="tabular-nums">{p.completedTasks}/{p.totalTasks} done · {p.progress}%</span>
                      <span className="flex items-center gap-2">{p.dueDate ? dueLabel(p.dueDate) : 'No due date'}{p.createdBy && <span title={`Created by ${p.createdBy.fullName}`}><Avatar user={p.createdBy} size={18} /></span>}</span>
                    </div>
                  </Link>
                </motion.li>
              ))}
            </motion.ul>
          ) : (
            <ul className="card divide-y divide-line overflow-hidden">
              {data.content.map((p) => (
                <li key={p.id}>
                  <Link to={`/app/projects/${p.id}`} className="grid items-center gap-x-5 gap-y-2 px-4 py-3 transition-colors hover:bg-sunken/70 md:grid-cols-[minmax(0,1.4fr)_120px_minmax(120px,1fr)_130px_auto]">
                    <span className="min-w-0"><span className="block truncate text-sm font-medium">{p.name}</span><span className="block truncate text-xs text-muted">{p.description || 'No description'}</span></span>
                    {status(p)}
                    <span className="flex items-center gap-3"><span className="flex-1"><Progress value={p.progress} label={`${p.name} completion`} /></span><span className="w-12 text-right text-xs tabular-nums">{p.completedTasks}/{p.totalTasks}</span></span>
                    <span className="text-xs text-muted">{p.dueDate ? dueLabel(p.dueDate) : 'No due date'}</span>
                    {p.createdBy && <span title={`Created by ${p.createdBy.fullName}`}><Avatar user={p.createdBy} size={22} /></span>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Pagination page={data.page} totalPages={data.totalPages} totalElements={data.totalElements} onPage={setPage} />
        </div>
      )}
      <ProjectFormModal open={modal} onClose={() => setModal(false)} workspaceId={current.id} onSaved={() => { setModal(false); setPage(0); res.reload() }} />
    </>
  )
}
