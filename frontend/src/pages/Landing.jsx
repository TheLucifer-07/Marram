import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Activity, BarChart3, ChevronDown, FolderKanban, ListChecks, Menu, MessagesSquare, ShieldCheck, Users, X } from 'lucide-react'
import Logo from '../components/ui/Logo'
import ThemeToggle from '../components/ui/ThemeToggle'
import Button from '../components/ui/Button'
import Avatar from '../components/ui/Avatar'
import ProductPreview, { MiniBoard, SAMPLE_PEOPLE, StatusBeamSample } from '../components/marketing/ProductPreview'
import { GrassArt } from './AuthLayout'
import { useAuth } from '../context/AuthContext'
import { ROLE_META } from '../lib/constants'
import { fadeUp, stagger, transitions } from '../lib/motion'

const reveal = { variants: stagger(0.08), initial: 'hidden', whileInView: 'show', viewport: { once: true, margin: '-80px' } }

const FEATURES = [
  [Users, 'Workspaces and roles', 'One workspace per team. Owner, lead and member roles decide who plans work and who moves it, and the server enforces them.'],
  [FolderKanban, 'Projects with deadlines', 'Start and due dates, live completion counts and a clear status. Archive a project when it ships and it stays readable.'],
  [ListChecks, 'Tasks with one owner each', 'Priority, assignee and due date on every task, moving through a defined workflow. List or board, same data.'],
  [Activity, 'A history nobody edits', 'Every status, priority, assignee and due-date change is recorded with who and when. Nothing quietly resets.'],
  [MessagesSquare, 'Comments on the task', 'Questions and decisions sit next to the work instead of scrolling away in chat.'],
  [BarChart3, 'A dashboard from real data', 'Open, overdue and blocked work, team load and a completion trend, all computed from your records.'],
]
const STEPS = [
  ['Create a workspace', 'You become its owner. Add teammates by the email they signed up with.'],
  ['Start a project', 'A name and a date range. Leads and the owner can edit it.'],
  ['Break it into tasks', 'Assign each one, set a priority and a due date.'],
  ['Move work forward', 'To do, in progress, in review, blocked, done. Invalid jumps are refused and every move is logged.'],
  ['Watch it finish', 'The dashboard shows progress, risk and what is due next.'],
]
const FAQ = [
  ['Who is Marram for?', 'Small teams: student project groups, small development teams and groups running internal projects. It is deliberately simpler than an enterprise suite.'],
  ['How do I sign in?', 'With email and password, or with your Google account. Sign-in is handled by Supabase Auth.'],
  ['How do I add a teammate?', 'They create their own account first. Then the workspace owner adds them by email and picks a role.'],
  ['Can members see everything?', 'Members see every project and task in their workspace. They can change only tasks assigned to them, and they can comment on any task.'],
  ['Does it send email notifications?', 'Not yet. Notifications are outside this version.'],
]
const HISTORY = [
  ['priya', 'created the task', 'Draft the launch announcement', '9:02'],
  ['priya', 'changed assignee from Priya Nair to Kiran Das', '', '9:05'],
  ['kiran', 'changed status from To do to In progress', '', '11:40'],
  ['kiran', 'changed status from In progress to In review', '', '14:12'],
  ['arjun', 'changed status from In review to Done', '', '16:30'],
]

function Row({ eyebrow, title, body, children, flip }) {
  return (
    <motion.div {...reveal} className="grid items-center gap-8 lg:grid-cols-2 lg:gap-16">
      <motion.div variants={fadeUp} className={flip ? 'lg:order-2' : ''}>
        <p className="eyebrow text-primary">{eyebrow}</p>
        <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">{title}</h2>
        <p className="mt-3 max-w-md text-muted">{body}</p>
      </motion.div>
      <motion.div variants={fadeUp} className="card p-4 sm:p-5">{children}<p className="mt-3 text-[10px] font-medium uppercase tracking-wide text-muted">Sample data</p></motion.div>
    </motion.div>
  )
}

export default function Landing() {
  const { isAuthenticated } = useAuth()
  const [open, setOpen] = useState(false)
  const links = [['Product', '#product'], ['Features', '#features'], ['Workflow', '#workflow'], ['Security', '#security']]
  const cta = isAuthenticated ? { to: '/app', label: 'Open app' } : { to: '/register', label: 'Get started' }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-nav border-b border-line bg-bg/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Link to="/" aria-label="Marram home"><Logo /></Link>
          <nav aria-label="Primary" className="hidden items-center gap-7 text-sm md:flex">{links.map(([l, h]) => <a key={l} href={h} className="text-muted transition-colors hover:text-ink">{l}</a>)}</nav>
          <div className="hidden items-center gap-2 md:flex">
            <ThemeToggle />
            {!isAuthenticated && <Link to="/login" className="rounded px-3 py-2 text-sm font-medium text-muted hover:text-ink">Sign in</Link>}
            <Link to={cta.to}><Button>{cta.label}</Button></Link>
          </div>
          <div className="flex items-center gap-1 md:hidden"><ThemeToggle /><button type="button" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen(!open)} className="rounded p-2 text-muted hover:bg-sunken">{open ? <X size={20} /> : <Menu size={20} />}</button></div>
        </div>
        {open && (
          <div className="border-t border-line px-5 py-3 md:hidden">
            {links.map(([l, h]) => <a key={l} href={h} onClick={() => setOpen(false)} className="block py-2 text-sm">{l}</a>)}
            <div className="mt-2 flex gap-2">{!isAuthenticated && <Link to="/login" className="flex-1"><Button variant="secondary" className="w-full">Sign in</Button></Link>}<Link to={cta.to} className="flex-1"><Button className="w-full">{cta.label}</Button></Link></div>
          </div>
        )}
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(60%_60%_at_50%_0%,rgb(var(--primary)/0.10),transparent)]" />
          <div className="relative mx-auto max-w-6xl px-5 pb-20 pt-14 sm:pt-20">
            <motion.div variants={stagger(0.08)} initial="hidden" animate="show" className="mx-auto max-w-3xl text-center">
              <motion.p variants={fadeUp} className="eyebrow text-primary">Team workflow and project management</motion.p>
              <motion.h1 variants={fadeUp} className="mt-4 text-[40px] font-semibold leading-[1.04] sm:text-6xl">Hold the work together.</motion.h1>
              <motion.p variants={fadeUp} className="mx-auto mt-5 max-w-xl text-lg text-muted">Marram is where small teams plan projects, give every task an owner, and keep an honest record of how the work moved. Shifting plans, steady ground.</motion.p>
              <motion.div variants={fadeUp} className="mt-8 flex flex-wrap justify-center gap-3">
                <Link to={cta.to}><Button size="lg">{isAuthenticated ? 'Open your workspace' : 'Start a workspace'}</Button></Link>
                <a href="#product"><Button size="lg" variant="secondary">See the product</Button></a>
              </motion.div>
              <motion.p variants={fadeUp} className="mt-4 text-sm text-muted">Sign in with email or Google. No card required.</motion.p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ ...transitions.hero, delay: 0.25 }} className="mx-auto mt-14 max-w-4xl"><ProductPreview /></motion.div>
          </div>
        </section>

        <section id="product" className="mx-auto max-w-6xl space-y-24 px-5 py-20">
          <Row eyebrow="Dashboard" title="See the whole workspace in one glance." body="Open work, what is overdue or blocked, how each project is doing, who is carrying how much. Every number is read from your records.">
            <div className="grid grid-cols-3 gap-2">{[['Open', '24', ''], ['Overdue', '2', 'text-danger'], ['Done this week', '8', 'text-s-done']].map(([l, v, c]) => <div key={l} className="rounded-md border border-line p-2.5"><p className="eyebrow">{l}</p><p className={`mt-1 font-display text-2xl font-semibold ${c}`}>{v}</p></div>)}</div>
            <div className="mt-4"><StatusBeamSample /></div>
            <ul className="mt-4 space-y-2.5">{[['Website launch', 72], ['Billing rework', 41], ['Onboarding flow', 90]].map(([n, p]) => <li key={n}><div className="mb-1 flex justify-between text-xs"><span className="font-medium">{n}</span><span className="tabular-nums text-muted">{p}%</span></div><div className="h-1.5 rounded-full bg-sunken"><div className="h-full rounded-full bg-primary" style={{ width: `${p}%` }} /></div></li>)}</ul>
          </Row>
          <Row flip eyebrow="Board" title="Move work with a drag, or with the keyboard." body="Drag a card to the next column, or use the move menu on any card. The server checks the workflow and your role, so a bad move is refused instead of silently accepted.">
            <MiniBoard lift />
          </Row>
          <Row eyebrow="History" title="Every change has a name and a time." body="Status, priority, assignee and due date changes are written to an append-only history. It cannot be edited from the app, so the record stays honest.">
            <ol className="space-y-3">{HISTORY.map(([who, what, target, at]) => (
              <li key={at} className="flex gap-3"><Avatar user={SAMPLE_PEOPLE[who]} size={24} /><p className="text-sm"><span className="font-medium">{SAMPLE_PEOPLE[who].fullName}</span> <span className="text-muted">{what}</span>{target && <> <span className="font-medium">{target}</span></>} <span className="text-xs text-muted">· {at}</span></p></li>
            ))}</ol>
          </Row>
        </section>

        <section id="features" className="border-y border-line bg-sunken/50 py-20">
          <div className="mx-auto max-w-6xl px-5">
            <h2 className="max-w-xl text-3xl font-semibold sm:text-4xl">Everything a small team needs. Nothing to configure.</h2>
            <motion.ul {...reveal} className="mt-12 grid gap-x-10 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(([Icon, title, body]) => <motion.li key={title} variants={fadeUp}><Icon size={22} className="text-primary" aria-hidden="true" /><h3 className="mt-3 text-lg font-semibold">{title}</h3><p className="mt-1.5 text-sm leading-relaxed text-muted">{body}</p></motion.li>)}
            </motion.ul>
          </div>
        </section>

        <section id="workflow" className="mx-auto max-w-6xl px-5 py-20">
          <h2 className="max-w-xl text-3xl font-semibold sm:text-4xl">From an empty workspace to a finished project.</h2>
          <motion.ol {...reveal} className="mt-12 grid gap-6 md:grid-cols-5">
            {STEPS.map(([title, body], i) => <motion.li key={title} variants={fadeUp} className="border-t-2 border-primary pt-4"><span className="font-display text-sm font-semibold text-primary">Step {i + 1}</span><h3 className="mt-1 text-base font-semibold">{title}</h3><p className="mt-1.5 text-sm text-muted">{body}</p></motion.li>)}
          </motion.ol>
        </section>

        <section id="security" className="border-y border-line bg-primary text-primary-ink">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-20 lg:grid-cols-[1fr_320px]">
            <div>
              <ShieldCheck size={26} aria-hidden="true" />
              <h2 className="mt-4 max-w-xl text-3xl font-semibold sm:text-4xl">Permissions live on the server.</h2>
              <p className="mt-4 max-w-xl opacity-90">Marram hides buttons you cannot use, but that is never the protection. Every request is checked against your role in that workspace, and people outside a workspace cannot reach its projects or tasks by guessing an address.</p>
              <ul className="mt-6 grid max-w-xl gap-3 sm:grid-cols-3">{['OWNER', 'LEAD', 'MEMBER'].map((r) => <li key={r} className="rounded-lg bg-primary-ink/10 p-3 text-sm"><span className="flex items-center gap-2 font-semibold">{ROLE_META[r].label}</span><span className="mt-1 block text-xs opacity-85">{ROLE_META[r].blurb}</span></li>)}</ul>
            </div>
            <GrassArt className="hidden w-full text-primary-ink/85 lg:block" />
          </div>
        </section>

        <section id="faq" className="mx-auto max-w-3xl px-5 py-20">
          <h2 className="text-3xl font-semibold">Questions</h2>
          <div className="mt-8 divide-y divide-line border-y border-line">
            {FAQ.map(([q, a]) => <details key={q} className="group py-4"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-medium"><span>{q}</span><ChevronDown size={18} className="shrink-0 text-muted transition-transform group-open:rotate-180" /></summary><p className="mt-2 max-w-2xl text-sm text-muted">{a}</p></details>)}
          </div>
        </section>

        <section className="border-t border-line bg-sunken/50">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-5 py-16 sm:flex-row sm:items-center">
            <h2 className="max-w-md text-3xl font-semibold">Give every task an owner.</h2>
            <Link to={cta.to}><Button size="lg">{isAuthenticated ? 'Open app' : 'Create your workspace'}</Button></Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-10 text-sm sm:grid-cols-[1.4fr_1fr_1fr]">
          <div><Logo size={22} /><p className="mt-3 max-w-xs text-muted">Hold the work together.</p></div>
          <nav aria-label="Product"><p className="eyebrow mb-3">Product</p><ul className="space-y-2">{[['Product', '#product'], ['Features', '#features'], ['Workflow', '#workflow'], ['Security', '#security'], ['Questions', '#faq']].map(([l, h]) => <li key={l}><a href={h} className="text-muted hover:text-ink">{l}</a></li>)}</ul></nav>
          <nav aria-label="Account"><p className="eyebrow mb-3">Account</p><ul className="space-y-2"><li><Link to="/login" className="text-muted hover:text-ink">Sign in</Link></li><li><Link to="/register" className="text-muted hover:text-ink">Create an account</Link></li></ul></nav>
        </div>
        <p className="border-t border-line px-5 py-4 text-center text-xs text-muted">Built with React, Spring Boot, MySQL and Supabase Auth.</p>
      </footer>
    </div>
  )
}
