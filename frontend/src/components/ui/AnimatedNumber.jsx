import { useEffect, useRef } from 'react'
import { animate, useReducedMotion } from 'framer-motion'

/**
 * Counts from the previous value to the new one by writing straight to the text node (no React re-render per frame).
 * With reduced motion it shows the final value at once. The aria-label always carries the real value.
 */
export default function AnimatedNumber({ value, format = (n) => Math.round(n).toLocaleString(), className = '' }) {
  const reduce = useReducedMotion()
  const el = useRef(null)
  const from = useRef(null)
  const fmt = useRef(format)
  useEffect(() => { fmt.current = format })
  useEffect(() => {
    const node = el.current
    if (!node) return undefined
    if (reduce || from.current === null && value === 0) { node.textContent = fmt.current(value); from.current = value; return undefined }
    const controls = animate(from.current ?? 0, value, { duration: 0.7, ease: [0.22, 1, 0.36, 1], onUpdate: (v) => { node.textContent = fmt.current(v) } })
    from.current = value
    return () => controls.stop()
  }, [value, reduce])
  return <span ref={el} className={`tabular-nums ${className}`} aria-label={String(value)}>{format(reduce ? value : 0)}</span>
}
