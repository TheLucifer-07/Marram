import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { transitions } from '../lib/motion'
import Logo from '../components/ui/Logo'
import ThemeToggle from '../components/ui/ThemeToggle'
import Button from '../components/ui/Button'
import { TextArea, TextInput, Select } from '../components/ui/Field'
import { ROLES, ROLE_META, PRIORITIES, PRIORITY_META } from '../lib/constants'
import { Api, errorMessage } from '../lib/api'
import { useWorkspace } from '../context/WorkspaceContext'
import { useAuth } from '../context/AuthContext'
import { RoleBadge } from '../components/ui/Badges'

const STEPS = ['Workspace', 'Project', 'Task']
const today = () => new Date().toISOString().slice(0, 10)

export default function Onboarding() {
  const { profile } = useAuth()
  const { workspaces, reload, select } = useWorkspace()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [ws, setWs] = useState(null)
  const [project, setProject] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [wsForm, setWsForm] = useState({ name: '', description: '' })
  const [pForm, setPForm] = useState({ name: '', dueDate: '' })
  const [tForm, setTForm] = useState({ title: '', priority: 'MEDIUM' })

  // Returning users never see onboarding again; only the in-progress first run stays here.
  if (workspaces.length > 0 && !ws) return <Navigate to="/app" replace />

  async function run(fn) {
    setBusy(true); setError(null)
    try { await fn() } catch (e) { setError(errorMessage(e)) } finally { setBusy(false) }
  }

  const createWorkspace = (e) => { e.preventDefault(); if (!wsForm.name.trim()) return setError('Give your workspace a name.')
    run(async () => { const created = await Api.createWorkspace({ name: wsForm.name.trim(), description: wsForm.description.trim() || null }); setWs(created); setStep(1) }) }
  const createProject = (e) => { e.preventDefault(); if (!pForm.name.trim()) return setError('Give your project a name.')
    run(async () => { setProject(await Api.createProject(ws.id, { name: pForm.name.trim(), description: null, startDate: today(), dueDate: pForm.dueDate || null })); setStep(2) }) }
  const createTask = (e) => { e.preventDefault(); if (!tForm.title.trim()) return setError('Give your task a title.')
    run(async () => { await Api.createTask(project.id, { title: tForm.title.trim(), description: null, priority: tForm.priority, assigneeId: profile.id, dueDate: null }); await finish() }) }
  async function finish() { await reload(); select(ws.id); navigate('/app', { replace: true }) }

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col px-6 py-6">
      <header className="flex items-center justify-between"><Logo /><ThemeToggle /></header>
      <main className="flex-1">
      <ol className="mt-10 flex items-center gap-2" aria-label="Setup progress">
        {STEPS.map((s, i) => (
          <li key={s} className="flex flex-1 items-center gap-2" aria-current={i === step ? 'step' : undefined}>
            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${i < step ? 'bg-primary text-primary-ink' : i === step ? 'border-2 border-primary text-primary' : 'border border-line text-muted'}`}>
              {i < step ? <Check size={13} /> : i + 1}
            </span>
            <span className={`hidden text-xs sm:inline ${i === step ? 'font-medium' : 'text-muted'}`}>{s}</span>
            {i < STEPS.length - 1 && <span className="h-px flex-1 bg-line" />}
          </li>
        ))}
      </ol>

      <AnimatePresence mode="wait">
        <motion.div key={step} className="mt-10" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={transitions.popover}>
          {step === 0 && (
            <form onSubmit={createWorkspace} className="space-y-4" noValidate>
              <h1 className="text-3xl font-semibold">Name your workspace</h1>
              <p className="text-muted">Hi {profile?.fullName?.split(' ')[0]}. A workspace is the home for one team&apos;s projects. You can create more later.</p>
              <TextInput label="Workspace name" value={wsForm.name} maxLength={120} onChange={(e) => setWsForm({ ...wsForm, name: e.target.value })} placeholder="Capstone team" />
              <TextArea label="What does this team work on? (optional)" rows={3} value={wsForm.description} onChange={(e) => setWsForm({ ...wsForm, description: e.target.value })} />
              {error && <p role="alert" className="text-sm font-medium text-danger">{error}</p>}
              <Button type="submit" size="lg" loading={busy}>Create workspace</Button>
              <div className="rounded-lg border border-line bg-surface p-4">
                <p className="eyebrow mb-2">Roles are set per workspace</p>
                <ul className="space-y-2">{ROLES.map((r) => <li key={r} className="flex items-start gap-3 text-sm"><RoleBadge role={r} /><span className="text-muted">{ROLE_META[r].blurb}</span></li>)}</ul>
                <p className="mt-2 text-xs text-muted">You will be the owner. The server enforces these, not just the interface.</p>
              </div>
            </form>
          )}
          {step === 1 && (
            <form onSubmit={createProject} className="space-y-4" noValidate>
              <h1 className="text-3xl font-semibold">Start your first project</h1>
              <p className="text-muted">Projects group tasks that share a goal and a deadline.</p>
              <TextInput label="Project name" value={pForm.name} maxLength={150} onChange={(e) => setPForm({ ...pForm, name: e.target.value })} placeholder="Website launch" />
              <TextInput label="Due date (optional)" type="date" value={pForm.dueDate} onChange={(e) => setPForm({ ...pForm, dueDate: e.target.value })} />
              {error && <p role="alert" className="text-sm font-medium text-danger">{error}</p>}
              <div className="flex gap-2"><Button type="submit" size="lg" loading={busy}>Create project</Button><Button variant="ghost" size="lg" onClick={finish}>Skip for now</Button></div>
            </form>
          )}
          {step === 2 && (
            <form onSubmit={createTask} className="space-y-4" noValidate>
              <h1 className="text-3xl font-semibold">Add the first task</h1>
              <p className="text-muted">It is assigned to you in {project?.name}. Every status change from here on is recorded in the task history.</p>
              <TextInput label="Task title" value={tForm.title} maxLength={180} onChange={(e) => setTForm({ ...tForm, title: e.target.value })} placeholder="Draft the landing page copy" />
              <Select label="Priority" value={tForm.priority} onChange={(e) => setTForm({ ...tForm, priority: e.target.value })}>
                {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_META[p].label}</option>)}
              </Select>
              {error && <p role="alert" className="text-sm font-medium text-danger">{error}</p>}
              <div className="flex gap-2"><Button type="submit" size="lg" loading={busy}>Create task and finish</Button><Button variant="ghost" size="lg" onClick={finish}>Skip for now</Button></div>
            </form>
          )}
        </motion.div>
      </AnimatePresence>
      </main>
    </div>
  )
}
