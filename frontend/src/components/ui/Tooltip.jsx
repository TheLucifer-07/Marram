import { useId, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { transitions } from '../../lib/motion'

/** Small label on hover or keyboard focus. The trigger keeps its own accessible name; the tip is described-by. */
export default function Tooltip({ label, children, side = 'right' }) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const pos = { right: 'left-full top-1/2 ml-2 -translate-y-1/2', top: 'bottom-full left-1/2 mb-2 -translate-x-1/2', bottom: 'top-full left-1/2 mt-2 -translate-x-1/2' }[side]
  return (
    <span className="relative inline-flex" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)} onFocus={() => setOpen(true)} onBlur={() => setOpen(false)} aria-describedby={open ? id : undefined}>
      {children}
      <AnimatePresence>
        {open && (
          <motion.span id={id} role="tooltip" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={transitions.popover}
            className={`pointer-events-none absolute z-tooltip whitespace-nowrap rounded bg-ink px-2 py-1 text-xs font-medium text-bg shadow-lift ${pos}`}>
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  )
}
