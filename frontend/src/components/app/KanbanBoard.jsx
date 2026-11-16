import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRightLeft, Check } from 'lucide-react'
import { STATUSES, STATUS_META } from '../../lib/constants'
import { PriorityMark } from '../ui/Badges'
import Avatar from '../ui/Avatar'
import Menu from '../ui/Menu'
import Tabs from '../ui/Tabs'
import { DueText } from './TaskList'
import { useMediaQuery } from '../../hooks'
import { spring } from '../../lib/motion'

/**
 * A second view over the same task list. A move is applied optimistically, sent to the server
 * (which validates the workflow and the person's role), and rolled back if the server refuses.
 * Every card also has a "Move to" menu, which is the keyboard and screen-reader path.
 */
export default function KanbanBoard({ tasks, onMove }) {
  const wide = useMediaQuery('(min-width: 1024px)')
  const [pending, setPending] = useState({})
  const [dragId, setDragId] = useState(null)
  const [overCol, setOverCol] = useState(null)
  const [justDone, setJustDone] = useState(null)
  const [mobileCol, setMobileCol] = useState('TODO')
  const focusAfter = useRef(null)

  useEffect(() => setPending({}), [tasks]) // fresh server data replaces any optimistic state
  // A moved card re-mounts in its new column; hand keyboard focus to its menu button so it is not lost.
  useEffect(() => {
    if (focusAfter.current === null) return
    const target = document.querySelector(`[data-card-menu="${focusAfter.current}"]`)
    if (target) { target.focus(); focusAfter.current = null }
  })

  const view = tasks.map((t) => (pending[t.id] ? { ...t, status: pending[t.id] } : t))
  const dragging = view.find((t) => t.id === dragId)
  const original = tasks.find((t) => t.id === dragId)

  async function move(task, to) {
    const source = tasks.find((t) => t.id === task.id) ?? task
    if (source.status === to) return
    setPending((p) => ({ ...p, [task.id]: to }))
    const ok = await onMove(source, to)
    if (!ok) setPending((p) => { const { [task.id]: _gone, ...rest } = p; return rest })
    else if (to === 'DONE') { setJustDone(task.id); setTimeout(() => setJustDone(null), 700) }
  }

  const animateLayout = Object.keys(pending).length > 0 || justDone !== null
  const renderCard = (t) => {
    const draggable = t.canChangeStatus && t.allowedTransitions?.length > 0
    const src = tasks.find((x) => x.id === t.id) ?? t
    return (
      <motion.li key={t.id} layout={animateLayout ? 'position' : false} transition={spring.snappy}
        draggable={draggable} onDragStart={() => setDragId(t.id)} onDragEnd={() => { setDragId(null); setOverCol(null) }}
        animate={{ scale: justDone === t.id ? [1, 1.04, 1] : 1 }}
        className={`group rounded-md border bg-surface p-3 shadow-raise transition-[box-shadow,border-color,opacity] hover:shadow-lift ${draggable ? 'cursor-grab active:cursor-grabbing' : ''} ${dragId === t.id ? 'opacity-40' : ''} ${justDone === t.id ? 'border-s-done' : 'border-line'}`}>
        <div className="flex items-start justify-between gap-2">
          <Link to={`/app/tasks/${t.id}`} className="text-sm font-medium leading-snug hover:text-primary">{t.title}</Link>
          {draggable && (
            <Menu label={`Move ${t.title}`} trigger={<ArrowRightLeft size={14} />} triggerProps={{ 'data-card-menu': t.id }}
              items={src.allowedTransitions.map((s) => ({ label: `Move to ${STATUS_META[s].label}`, dot: STATUS_META[s].cls, onSelect: () => { focusAfter.current = t.id; move(t, s) } }))} />
          )}
        </div>
        <div className="mt-2.5 flex items-center justify-between gap-2">
          <span className="flex items-center gap-2"><PriorityMark priority={t.priority} showLabel={false} />{t.status === 'DONE' && <Check size={13} className="text-s-done" aria-label="Done" />}</span>
          <DueText task={t} />
          {t.assignee ? <Avatar user={t.assignee} size={20} /> : <span className="h-5 w-5 rounded-full border border-dashed border-line" title="Unassigned" />}
        </div>
      </motion.li>
    )
  }

  const column = (s) => {
    const items = view.filter((t) => t.status === s)
    const legal = original ? original.allowedTransitions?.includes(s) : false
    const active = overCol === s && dragging && original?.status !== s
    return (
      <section key={s} aria-label={STATUS_META[s].label}
        onDragOver={(e) => { e.preventDefault(); setOverCol(s) }} onDragLeave={() => setOverCol((c) => (c === s ? null : c))}
        onDrop={(e) => { e.preventDefault(); setOverCol(null); const id = dragId; setDragId(null); const t = view.find((x) => x.id === id); if (t && original?.status !== s) { if (legal) move(t, s); else onMove(original, s) } }}
        className={`rounded-lg border p-2 transition-colors duration-150 ${active ? (legal ? 'border-primary bg-primary-soft/60' : 'border-danger/60 bg-danger/5') : 'border-line bg-sunken/60'}`}>
        <h2 className="mb-2 flex items-center justify-between px-1.5 text-sm font-semibold">
          <span className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${STATUS_META[s].cls}`} />{STATUS_META[s].label}</span>
          <span className="text-xs font-normal tabular-nums text-muted">{items.length}</span>
        </h2>
        <ul className="flex min-h-[80px] flex-col gap-2">
          {items.map(renderCard)}
          {active && <li aria-hidden="true" className={`rounded-md border-2 border-dashed px-3 py-4 text-center text-xs ${legal ? 'border-primary/60 text-primary' : 'border-danger/50 text-danger'}`}>{legal ? 'Drop to move here' : 'This move is not allowed'}</li>}
          {items.length === 0 && !active && <li className="rounded-md px-3 py-6 text-center text-xs text-muted">No tasks</li>}
        </ul>
      </section>
    )
  }

  return (
    <div>
      {wide ? <div className="grid grid-cols-5 gap-3">{STATUSES.map(column)}</div> : (
        <div className="space-y-3">
          <Tabs label="Board columns" value={mobileCol} onChange={setMobileCol} tabs={STATUSES.map((s) => ({ value: s, label: STATUS_META[s].label, count: view.filter((t) => t.status === s).length }))} />
          {column(mobileCol)}
        </div>
      )}
      <p className="mt-3 text-xs text-muted">{wide ? 'Drag a card to another column, or use the move menu on a card. ' : 'Use the move menu on a card to change its status. '}The server checks the workflow and your role on every move.</p>
    </div>
  )
}
