import { Suspense, useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronsUpDown, FolderKanban, LayoutDashboard, ListChecks, LogOut, Menu, PanelLeftClose, PanelLeftOpen, Plus, Settings as Cog, Users, X } from 'lucide-react'
import Logo, { LogoMark } from '../ui/Logo'
import { PageLoader } from '../ui/States'
import ThemeToggle from '../ui/ThemeToggle'
import Tooltip from '../ui/Tooltip'
import Avatar from '../ui/Avatar'
import { RoleBadge } from '../ui/Badges'
import { useAuth } from '../../context/AuthContext'
import { useWorkspace } from '../../context/WorkspaceContext'
import { useDialogFocus, useMediaQuery, useStoredState } from '../../hooks'
import { page as pageMotion, spring, transitions } from '../../lib/motion'
import WorkspaceFormModal from './WorkspaceFormModal'

const NAV = [
  { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/app/projects', label: 'Projects', icon: FolderKanban },
  { to: '/app/tasks', label: 'Tasks', icon: ListChecks },
  { to: '/app/members', label: 'Members', icon: Users },
  { to: '/app/settings', label: 'Settings', icon: Cog },
]

function WorkspaceSwitcher({ collapsed, onNew }) {
  const { workspaces, current, select } = useWorkspace()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    const esc = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', close); document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc) }
  }, [])
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-haspopup="listbox" aria-expanded={open} aria-label={`Workspace: ${current?.name}`}
        className={`flex w-full items-center gap-2.5 rounded-md border border-line bg-surface text-left transition-colors hover:bg-sunken ${collapsed ? 'justify-center p-2' : 'px-2.5 py-2'}`}>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-primary-soft font-display text-sm font-semibold text-primary">{current?.name?.[0]?.toUpperCase()}</span>
        {!collapsed && (<>
          <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold leading-tight">{current?.name}</span><span className="block text-[11px] text-muted">{current?.memberCount} {current?.memberCount === 1 ? 'member' : 'members'}</span></span>
          <ChevronsUpDown size={15} className="shrink-0 text-muted" />
        </>)}
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul role="listbox" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={transitions.popover}
            className="absolute left-0 top-full z-overlay mt-1 max-h-72 w-64 overflow-auto rounded-lg border border-line bg-raised p-1 shadow-pop">
            {workspaces.map((w) => (
              <li key={w.id} role="option" aria-selected={w.id === current?.id}>
                <button type="button" onClick={() => { select(w.id); setOpen(false) }} className="flex w-full items-center justify-between gap-2 rounded px-2.5 py-2 text-left text-sm hover:bg-sunken">
                  <span className="truncate">{w.name}</span>
                  <span className="flex items-center gap-2"><RoleBadge role={w.myRole} />{w.id === current?.id && <Check size={14} className="text-primary" />}</span>
                </button>
              </li>
            ))}
            <li className="mt-1 border-t border-line pt-1">
              <button type="button" onClick={() => { setOpen(false); onNew() }} className="flex w-full items-center gap-2 rounded px-2.5 py-2 text-sm text-primary hover:bg-sunken"><Plus size={14} /> New workspace</button>
            </li>
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}

function SidebarContent({ collapsed, onNavigate, onNewWorkspace, onToggle, showToggle }) {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const activeTo = NAV.filter((n) => (n.end ? pathname === n.to : pathname.startsWith(n.to))).sort((a, b) => b.to.length - a.to.length)[0]?.to
  return (
    <div className={`flex h-full flex-col gap-4 p-3 ${collapsed ? 'items-stretch' : ''}`}>
      <div className={`flex items-center px-1.5 pt-1 ${collapsed ? 'justify-center' : 'justify-between'}`}>
        {collapsed ? <LogoMark size={28} /> : <Logo />}
      </div>
      <WorkspaceSwitcher collapsed={collapsed} onNew={onNewWorkspace} />
      <nav aria-label="Main" className="flex flex-col gap-0.5">
        {NAV.map(({ to, label, icon: Icon, end }) => {
          const active = activeTo === to
          const link = (
            <NavLink key={to} to={to} end={end} onClick={onNavigate} aria-label={collapsed ? label : undefined}
              className={`relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${collapsed ? 'justify-center' : ''} ${active ? 'text-primary' : 'text-muted hover:bg-sunken hover:text-ink'}`}>
              {active && <motion.span layoutId="nav-active" className="absolute inset-0 rounded-md bg-primary-soft" transition={spring.snappy} />}
              <Icon size={18} aria-hidden="true" className="relative" />
              {!collapsed && <span className="relative">{label}</span>}
            </NavLink>
          )
          return collapsed ? <Tooltip key={to} label={label}>{link}</Tooltip> : link
        })}
      </nav>
      <div className="mt-auto space-y-2">
        {showToggle && (
          <button type="button" onClick={onToggle} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-pressed={collapsed}
            className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted transition-colors hover:bg-sunken hover:text-ink ${collapsed ? 'justify-center' : ''}`}>
            {collapsed ? <PanelLeftOpen size={18} /> : <><PanelLeftClose size={18} /> Collapse</>}
          </button>
        )}
        <div className={`flex items-center gap-2.5 rounded-md border border-line bg-surface ${collapsed ? 'justify-center p-2' : 'p-2.5'}`}>
          <Avatar user={profile} size={30} />
          {!collapsed && (<>
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium leading-tight">{profile?.fullName}</p><p className="truncate text-[11px] text-muted">{profile?.email}</p></div>
            <button type="button" aria-label="Sign out" title="Sign out" onClick={async () => { await signOut(); navigate('/') }} className="rounded p-1.5 text-muted hover:bg-sunken hover:text-ink"><LogOut size={16} /></button>
          </>)}
        </div>
      </div>
    </div>
  )
}

function MobileNav({ open, onClose, onNewWorkspace }) {
  const ref = useRef(null)
  useDialogFocus(open, ref, onClose)
  return (
    <div className="fixed inset-0 z-overlay lg:hidden">
      <motion.div className="absolute inset-0 bg-ink/45" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div ref={ref} role="dialog" aria-modal="true" aria-label="Navigation" className="absolute inset-y-0 left-0 w-[284px] max-w-[85vw] border-r border-line bg-nav" initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }} transition={transitions.drawer}>
        <button type="button" aria-label="Close menu" onClick={onClose} className="absolute right-3 top-4 inline-flex h-8 w-8 items-center justify-center rounded text-muted hover:bg-sunken"><X size={18} /></button>
        <SidebarContent collapsed={false} onNavigate={onClose} onNewWorkspace={onNewWorkspace} />
      </motion.div>
    </div>
  )
}

export default function AppShell() {
  const [drawer, setDrawer] = useState(false)
  const [newWs, setNewWs] = useState(false)
  const [collapsedPref, setCollapsed] = useStoredState('marram.sidebar.collapsed', false)
  const wide = useMediaQuery('(min-width: 1024px)')
  const { pathname } = useLocation()
  const { select, reload } = useWorkspace()
  const navigate = useNavigate()
  const collapsed = wide && collapsedPref
  useEffect(() => setDrawer(false), [pathname])

  return (
    <>
    <a href="#main" className="sr-only z-tooltip rounded bg-primary text-sm font-medium text-primary-ink focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:px-3 focus:py-2">Skip to content</a>
    <div className="min-h-screen lg:grid lg:transition-[grid-template-columns] lg:duration-300 lg:ease-out" style={wide ? { gridTemplateColumns: `${collapsed ? 'var(--sidebar-w-collapsed)' : 'var(--sidebar-w)'} minmax(0, 1fr)` } : undefined}>
      <aside aria-label="Sidebar" className="sticky top-0 hidden h-screen overflow-y-auto overflow-x-hidden border-r border-line bg-nav lg:block">
        <SidebarContent collapsed={collapsed} showToggle onToggle={() => setCollapsed(!collapsedPref)} onNewWorkspace={() => setNewWs(true)} />
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-sticky flex h-14 items-center justify-between border-b border-line bg-bg/85 px-4 backdrop-blur lg:justify-end">
          <button type="button" className="rounded p-2 text-muted hover:bg-sunken lg:hidden" aria-label="Open menu" onClick={() => setDrawer(true)}><Menu size={20} /></button>
          <div className="lg:hidden"><Logo size={24} /></div>
          <ThemeToggle />
        </header>
        <main id="main" tabIndex={-1} className="mx-auto w-full max-w-[1320px] outline-none flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <Suspense fallback={<PageLoader />}>
            <motion.div key={pathname} {...pageMotion}><Outlet /></motion.div>
          </Suspense>
        </main>
      </div>

      <AnimatePresence>{drawer && <MobileNav open={drawer} onClose={() => setDrawer(false)} onNewWorkspace={() => { setDrawer(false); setNewWs(true) }} />}</AnimatePresence>

      <WorkspaceFormModal open={newWs} onClose={() => setNewWs(false)} onSaved={async (ws) => { await reload(); select(ws.id); setNewWs(false); navigate('/app') }} />
    </div>
    </>
  )
}
