import { useEffect, useId, useRef } from 'react'
import { useDialogFocus } from '../../hooks'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { transitions } from '../../lib/motion'

/** Right-hand panel for secondary detail (member work, mobile filters). Escape and scrim close it. */
export default function Drawer({ open, onClose, title, description, children, width = 'max-w-md' }) {
  const titleId = useId()
  const panel = useRef(null)
  useDialogFocus(open, panel, onClose)
  useEffect(() => {
    if (!open) return undefined
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-modal">
          <motion.div className="absolute inset-0 bg-ink/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div ref={panel} role="dialog" aria-modal="true" aria-labelledby={titleId} initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={transitions.drawer}
            className={`absolute inset-y-0 right-0 flex w-full ${width} flex-col border-l border-line bg-raised shadow-pop`}>
            <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
              <div className="min-w-0"><h2 id={titleId} className="truncate text-lg font-semibold">{title}</h2>{description && <p className="mt-0.5 text-sm text-muted">{description}</p>}</div>
              <button type="button" onClick={onClose} aria-label="Close panel" className="rounded p-1 text-muted hover:bg-sunken hover:text-ink"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
