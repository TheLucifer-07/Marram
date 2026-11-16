import { useEffect, useId, useRef } from 'react'
import { useDialogFocus } from '../../hooks'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { transitions } from '../../lib/motion'

export default function Modal({ open, onClose, title, description, children, footer, width = 'max-w-lg' }) {
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
        <div className="fixed inset-0 z-modal flex items-end justify-center p-0 sm:items-center sm:p-4">
          <motion.div className="absolute inset-0 bg-ink/45" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            ref={panel}
            role="dialog" aria-modal="true" aria-labelledby={titleId}
            className={`relative flex max-h-[92vh] w-full ${width} flex-col rounded-t-lg border border-line bg-surface shadow-pop sm:rounded-lg`}
            initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8 }}
            transition={transitions.overlay}
          >
            <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
              <div>
                <h2 id={titleId} className="text-lg font-semibold">{title}</h2>
                {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
              </div>
              <button type="button" onClick={onClose} aria-label="Close dialog" className="rounded p-1 text-muted hover:bg-sunken hover:text-ink"><X size={18} /></button>
            </div>
            <div className="overflow-y-auto px-5 py-4">{children}</div>
            {footer && <div className="flex justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
