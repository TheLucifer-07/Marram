import { motion, useReducedMotion } from 'framer-motion'
import { FolderKanban, LayoutDashboard, ListChecks, Settings, Users } from 'lucide-react'
import { LogoMark } from '../ui/Logo'
import { PriorityMark } from '../ui/Badges'
import Avatar from '../ui/Avatar'

/** Static sample data for marketing only. Every use is labelled "Sample data" on the page. */
export const SAMPLE_PEOPLE = {
  priya: { id: 1, fullName: 'Priya Nair' }, arjun: { id: 2, fullName: 'Arjun Rao' }, meera: { id: 3, fullName: 'Meera Iyer' }, kiran: { id: 4, fullName: 'Kiran Das' },
}
const COLUMNS = [
  { key: 'TODO', label: 'To do', dot: 'bg-s-todo', cards: [{ t: 'Write launch announcement', p: 'MEDIUM', who: 'priya' }, { t: 'Audit mobile layouts', p: 'LOW', who: 'kiran' }] },
  { key: 'IN_PROGRESS', label: 'In progress', dot: 'bg-s-progress', cards: [{ t: 'Build billing settings', p: 'HIGH', who: 'arjun' }, { t: 'Migrate user table', p: 'URGENT', who: 'meera' }] },
  { key: 'DONE', label: 'Done', dot: 'bg-s-done', cards: [{ t: 'Agree the scope', p: 'LOW', who: 'arjun' }] },
]

export function MiniBoard({ lift = false }) {
  const reduce = useReducedMotion()
  let n = 0
  return (
    <div className="grid grid-cols-3 gap-2">
      {COLUMNS.map((c) => (
        <div key={c.key} className="rounded-md bg-sunken/70 p-1.5">
          <p className="mb-1.5 flex items-center gap-1.5 px-1 text-[11px] font-semibold"><span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />{c.label}</p>
          <div className="space-y-1.5">
            {c.cards.map((card) => {
              const i = n++
              const lifted = lift && card.t === 'Build billing settings'
              return (
                <motion.div key={card.t} initial={reduce ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0, rotate: lifted ? -2 : 0 }} transition={{ delay: 0.3 + i * 0.1, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  className={`rounded border bg-surface p-2 ${lifted ? 'border-primary/50 shadow-lift' : 'border-line'}`}>
                  <p className="text-[11px] font-medium leading-snug">{card.t}</p>
                  <div className="mt-1.5 flex items-center justify-between"><PriorityMark priority={card.p} showLabel={false} /><Avatar user={SAMPLE_PEOPLE[card.who]} size={16} /></div>
                </motion.div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

export function StatusBeamSample() {
  return (
    <div>
      <div className="flex h-2.5 overflow-hidden rounded-full bg-sunken"><div className="w-[18%] bg-s-todo" /><div className="w-[34%] bg-s-progress" /><div className="w-[12%] bg-s-review" /><div className="w-[6%] bg-s-blocked" /><div className="w-[30%] bg-s-done" /></div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted">{[['To do', 'bg-s-todo'], ['In progress', 'bg-s-progress'], ['Review', 'bg-s-review'], ['Blocked', 'bg-s-blocked'], ['Done', 'bg-s-done']].map(([l, c]) => <span key={l} className="flex items-center gap-1"><span className={`h-1.5 w-1.5 rounded-full ${c}`} />{l}</span>)}</div>
    </div>
  )
}

const NAV_ICONS = [LayoutDashboard, FolderKanban, ListChecks, Users, Settings]

/** A faithful miniature of the real app shell and dashboard, built from the same tokens as the product. */
export default function ProductPreview() {
  return (
    <div className="card overflow-hidden shadow-pop" role="img" aria-label="Sample Marram dashboard with a project board">
      <div className="flex">
        <div className="hidden w-12 shrink-0 flex-col items-center gap-3 border-r border-line bg-nav py-3 sm:flex">
          <LogoMark size={22} />
          {NAV_ICONS.map((Icon, i) => <span key={i} className={`flex h-7 w-7 items-center justify-center rounded ${i === 0 ? 'bg-primary-soft text-primary' : 'text-muted'}`}><Icon size={14} /></span>)}
        </div>
        <div className="min-w-0 flex-1 p-3 sm:p-4">
          <div className="mb-3 flex items-center justify-between"><div><p className="eyebrow">Thursday · Product team</p><p className="font-display text-sm font-semibold">Good morning, Priya</p></div><span className="rounded-full bg-sunken px-2 py-0.5 text-[10px] font-medium text-muted">Sample data</span></div>
          <div className="mb-3 grid grid-cols-4 gap-2">
            {[['Open tasks', '24', ''], ['Completed', '31', 'text-s-done'], ['In progress', '9', ''], ['Overdue', '2', 'text-danger']].map(([l, v, c]) => (
              <div key={l} className="rounded-md border border-line bg-surface p-2"><p className="text-[9px] font-semibold uppercase tracking-wide text-muted">{l}</p><p className={`mt-1 font-display text-lg font-semibold leading-none ${c}`}>{v}</p></div>
            ))}
          </div>
          <div className="mb-3 rounded-md border border-line bg-surface p-2.5"><StatusBeamSample /></div>
          <MiniBoard lift />
        </div>
      </div>
    </div>
  )
}
