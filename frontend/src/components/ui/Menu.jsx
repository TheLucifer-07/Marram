import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { transitions } from '../../lib/motion'

/** Dropdown action menu. Arrow keys move, Enter activates, Escape closes and returns focus to the trigger. */
export default function Menu({ trigger, items, label, align = 'right', triggerProps = {} }) {
  const [open, setOpen] = useState(false)
  const root = useRef(null)
  const btn = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const away = (e) => { if (root.current && !root.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', away)
    root.current?.querySelector('[role="menuitem"]')?.focus()
    return () => document.removeEventListener('mousedown', away)
  }, [open])

  function onKey(e) {
    const els = [...(root.current?.querySelectorAll('[role="menuitem"]') ?? [])]
    const i = els.indexOf(document.activeElement)
    if (e.key === 'Escape') { setOpen(false); btn.current?.focus() }
    if (e.key === 'ArrowDown') { e.preventDefault(); els[(i + 1) % els.length]?.focus() }
    if (e.key === 'ArrowUp') { e.preventDefault(); els[(i - 1 + els.length) % els.length]?.focus() }
  }

  return (
    <div className="relative inline-block" ref={root} onKeyDown={onKey}>
      <button ref={btn} {...triggerProps} type="button" aria-haspopup="menu" aria-expanded={open} aria-label={label} onClick={() => setOpen((o) => !o)}
        className="inline-flex h-7 w-7 items-center justify-center rounded text-muted transition-colors hover:bg-sunken hover:text-ink">{trigger}</button>
      <AnimatePresence>
        {open && (
          <motion.div role="menu" aria-label={label} initial={{ opacity: 0, y: -4, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }} transition={transitions.popover}
            className={`absolute z-overlay mt-1 min-w-[180px] rounded-lg border border-line bg-raised p-1 shadow-pop ${align === 'right' ? 'right-0' : 'left-0'}`}>
            {items.map((it) => (
              <button key={it.label} role="menuitem" type="button" disabled={it.disabled}
                onClick={() => { setOpen(false); btn.current?.focus(); it.onSelect() }}
                className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left text-sm hover:bg-sunken focus:bg-sunken focus:outline-none disabled:opacity-50">
                {it.dot && <span className={`h-2 w-2 rounded-full ${it.dot}`} />}{it.label}
              </button>
            ))}
            {items.length === 0 && <p className="px-2.5 py-1.5 text-sm text-muted">No actions available</p>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
